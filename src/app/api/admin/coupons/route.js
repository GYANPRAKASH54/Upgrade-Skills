import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

async function verifyAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return null;
  }
  return session;
}

// GET: Fetch all coupons (with enrollment counts)
export async function GET(request) {
  try {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden. Admin credentials required.' }, { status: 403 });
    }

    const coupons = await prisma.coupon.findMany({
      include: {
        _count: {
          select: { enrollments: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, coupons });
  } catch (error) {
    console.error('Admin fetch coupons error:', error);
    return NextResponse.json({ error: 'Failed to fetch coupons.' }, { status: 500 });
  }
}

// POST: Create a new coupon
export async function POST(request) {
  try {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden. Admin credentials required.' }, { status: 403 });
    }

    const { code, discountType, discountValue, expiresAt, active } = await request.json();

    if (!code || !discountType || discountValue === undefined) {
      return NextResponse.json({ error: 'Code, Discount Type, and Discount Value are required.' }, { status: 400 });
    }

    const normalizedCode = code.trim().toUpperCase();

    // Check code uniqueness
    const existing = await prisma.coupon.findUnique({
      where: { code: normalizedCode },
    });

    if (existing) {
      return NextResponse.json({ error: 'A coupon with this code already exists.' }, { status: 400 });
    }

    if (discountType !== 'PERCENTAGE' && discountType !== 'FIXED') {
      return NextResponse.json({ error: 'Discount Type must be PERCENTAGE or FIXED.' }, { status: 400 });
    }

    const val = parseFloat(discountValue);
    if (isNaN(val) || val <= 0) {
      return NextResponse.json({ error: 'Discount value must be a positive number.' }, { status: 400 });
    }

    if (discountType === 'PERCENTAGE' && val > 100) {
      return NextResponse.json({ error: 'Percentage discount cannot exceed 100%.' }, { status: 400 });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: normalizedCode,
        discountType,
        discountValue: val,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        active: active !== undefined ? active : true,
      },
      include: {
        _count: {
          select: { enrollments: true },
        },
      },
    });

    await createAuditLog({
      userId: isAdmin.user.id,
      userEmail: isAdmin.user.email,
      action: 'COUPON_CREATE',
      details: { couponId: coupon.id, code: coupon.code, discountType, discountValue: val },
    });

    return NextResponse.json({
      success: true,
      message: 'Coupon created successfully!',
      coupon,
    }, { status: 201 });

  } catch (error) {
    console.error('Admin create coupon error:', error);
    return NextResponse.json({ error: 'Failed to create coupon.' }, { status: 500 });
  }
}

// DELETE: Delete/remove a coupon
export async function DELETE(request) {
  try {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden. Admin credentials required.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const couponId = searchParams.get('id');

    if (!couponId) {
      return NextResponse.json({ error: 'Coupon ID is required.' }, { status: 400 });
    }

    // Check existence
    const coupon = await prisma.coupon.findUnique({
      where: { id: couponId },
    });

    if (!coupon) {
      return NextResponse.json({ error: 'Coupon not found.' }, { status: 404 });
    }

    await createAuditLog({
      userId: isAdmin.user.id,
      userEmail: isAdmin.user.email,
      action: 'COUPON_DELETE',
      details: { couponId, code: coupon.code },
    });

    await prisma.coupon.delete({
      where: { id: couponId },
    });

    return NextResponse.json({
      success: true,
      message: 'Coupon deleted successfully!',
    });

  } catch (error) {
    console.error('Admin delete coupon error:', error);
    return NextResponse.json({ error: 'Failed to delete coupon.' }, { status: 500 });
  }
}
