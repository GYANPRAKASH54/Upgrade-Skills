import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request) {
  try {
    const { code, courseId } = await request.json();

    if (!code || !courseId) {
      return NextResponse.json({ error: 'Code and Course ID are required.' }, { status: 400 });
    }

    const normalizedCode = code.trim().toUpperCase();

    // Fetch coupon from DB
    const coupon = await prisma.coupon.findUnique({
      where: { code: normalizedCode },
    });

    if (!coupon) {
      return NextResponse.json({ error: 'Invalid coupon code.' }, { status: 404 });
    }

    if (!coupon.active) {
      return NextResponse.json({ error: 'This coupon is no longer active.' }, { status: 400 });
    }

    if (coupon.expiresAt && new Date() > new Date(coupon.expiresAt)) {
      return NextResponse.json({ error: 'This coupon has expired.' }, { status: 400 });
    }

    // Fetch course to calculate price
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found.' }, { status: 404 });
    }

    // Calculate discount amount and final price
    let discountAmount = 0;
    if (coupon.discountType === 'PERCENTAGE') {
      discountAmount = (course.price * coupon.discountValue) / 100;
    } else if (coupon.discountType === 'FIXED') {
      discountAmount = coupon.discountValue;
    }

    // Discount cannot exceed course price
    discountAmount = Math.min(discountAmount, course.price);
    const discountedPrice = Math.max(0, course.price - discountAmount);

    return NextResponse.json({
      success: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
      },
      discountAmount: Number(discountAmount.toFixed(2)),
      discountedPrice: Number(discountedPrice.toFixed(2)),
    });

  } catch (error) {
    console.error('Coupon validation error:', error);
    return NextResponse.json({ error: 'Internal server error validating coupon.' }, { status: 500 });
  }
}
