import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/db';
import { getAuthUser } from '../../../lib/auth';
import { getStudentTitle } from '../../../lib/utils';

export const GET: APIRoute = async ({ request }) => {
  const auth = await getAuthUser(request);
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const url = new URL(request.url);
  const search = url.searchParams.get('search') || '';
  const course = url.searchParams.get('course') || '';
  const status = url.searchParams.get('status') || '';
  const sort = url.searchParams.get('sort') || 'created_at';
  const order = url.searchParams.get('order') === 'asc' ? 'asc' : 'desc';

  try {
    const where: any = { userId: auth.userId };

    if (search) {
      where.OR = [
        { first_name: { contains: search, mode: 'insensitive' } },
        { last_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (course) where.course = course;
    if (status) where.status = status;

    const students = await prisma.student.findMany({
      where,
      orderBy: { [sort]: order }
    });

    const studentsWithTitles = students.map(s => ({
      ...s,
      title: getStudentTitle(s.gpa || 0)
    }));

    return new Response(JSON.stringify({ success: true, data: studentsWithTitles }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Database error', details: err.message }), { status: 500 });
  }
};

export const POST: APIRoute = async ({ request }) => {
  const auth = await getAuthUser(request);
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  try {
    const data = await request.json();
    
    const existing = await prisma.student.findFirst({
      where: { email: data.email, userId: auth.userId }
    });
    
    if (existing) {
      return new Response(JSON.stringify({ success: false, error: 'Student with this email already exists' }), { status: 400 });
    }

    const newStudent = await prisma.student.create({
      data: {
        ...data,
        gpa: parseFloat(data.gpa) || 0.0,
        userId: auth.userId
      }
    });

    return new Response(JSON.stringify({ success: true, message: 'Student magicalized successfully! ✨', id: newStudent.id }), { status: 201 });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  const auth = await getAuthUser(request);
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  try {
    const { ids } = await request.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'No IDs provided' }), { status: 400 });
    }

    await prisma.student.deleteMany({
      where: {
        id: { in: ids },
        userId: auth.userId
      }
    });

    return new Response(JSON.stringify({ success: true, message: `Poof! ${ids.length} students vanished! 🪄` }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: 'Failed to delete students' }), { status: 500 });
  }
};
