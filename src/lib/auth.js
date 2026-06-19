import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { prisma } from './db';
import { createAuditLog } from './audit';

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: 'select_account',
        },
      },
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'student@upgradeskills.co.in' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter an email and password');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          await createAuditLog({
            action: 'LOGIN_FAILURE',
            details: `Non-existent email: ${credentials.email}`,
            userEmail: credentials.email,
          });
          throw new Error('No user found with this email');
        }

        // We check the password
        const isValid = bcrypt.compareSync(credentials.password, user.password);

        if (!isValid) {
          await createAuditLog({
            userId: user.id,
            userEmail: user.email,
            action: 'LOGIN_FAILURE',
            details: 'Incorrect password attempt',
          });
          throw new Error('Incorrect password');
        }

        await createAuditLog({
          userId: user.id,
          userEmail: user.email,
          action: 'LOGIN_SUCCESS',
          details: { provider: 'credentials', role: user.role },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account.provider === 'google') {
        // Find or create user in DB
        let dbUser = await prisma.user.findUnique({
          where: { email: user.email },
        });

        const isNewUser = !dbUser;
        if (!dbUser) {
          // Create new user for google oauth
          const mockPassword = bcrypt.hashSync(Math.random().toString(36).substring(2), 10);
          dbUser = await prisma.user.create({
            data: {
              name: user.name || 'Google User',
              email: user.email,
              password: mockPassword,
              role: 'STUDENT', // Default role
            },
          });
        }
        user.id = dbUser.id;
        user.role = dbUser.role;

        await createAuditLog({
          userId: dbUser.id,
          userEmail: dbUser.email,
          action: 'LOGIN_SUCCESS',
          details: { provider: 'google', isNewUser, role: dbUser.role },
        });
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      
      // Dynamically fetch user role from DB to support OAuth and database updates
      if (token?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true, role: true },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/signin',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
