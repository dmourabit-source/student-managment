import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/db';
import { getAuthUser } from '../../../lib/auth';

export const GET: APIRoute = async ({ request, params }) => {
  const auth = await getAuthUser(request);
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  try {
    const student = await prisma.student.findFirst({
      where: { id: Number(params.id), userId: auth.userId },
      include: { notes: { orderBy: { created_at: 'desc' } } }
    });

    if (!student) {
      return new Response(JSON.stringify({ success: false, error: 'Student not found' }), { status: 404 });
    }

    return new Response(JSON.stringify({ success: true, data: student }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
};

export const PUT: APIRoute = async ({ request, params }) => {
  const auth = await getAuthUser(request);
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  try {
    const data = await request.json();
    
    // Check ownership
    const existing = await prisma.student.findFirst({
      where: { id: Number(params.id), userId: auth.userId }
    });
    if (!existing) return new Response(JSON.stringify({ success: false, error: 'Student not found' }), { status: 404 });

    const updatedStudent = await prisma.student.update({
      where: { id: Number(params.id) },
      data: {
        ...data,
        gpa: parseFloat(data.gpa) || 0.0,
      }
    });

    return new Response(JSON.stringify({ success: true, message: 'Student updated beautifully! 💅' }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ request, params }) => {
  const auth = await getAuthUser(request);
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  try {
    const del = await prisma.student.deleteMany({
      where: { id: Number(params.id), userId: auth.userId }
    });

    if (del.count === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Student not found or unauthorized' }), { status: 404 });
    }

    return new Response(JSON.stringify({ success: true, message: 'Student gracefully removed! 🦢' }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: 'Could not delete student' }), { status: 500 });
  }
};
