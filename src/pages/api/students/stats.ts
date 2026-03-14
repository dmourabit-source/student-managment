import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/db';
import { getAuthUser } from '../../../lib/auth';
import { getStudentTitle } from '../../../lib/utils';

export const GET: APIRoute = async ({ request }) => {
  const auth = await getAuthUser(request);
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  try {
    const students = await prisma.student.findMany({
      where: { userId: auth.userId }
    });

    const totalStudents = students.length;
    const activeStudents = students.filter(s => s.status === 'Active').length;
    const graduatedStudents = students.filter(s => s.status === 'Graduated').length;
    const totalGpa = students.reduce((sum, s) => sum + (s.gpa || 0), 0);
    const averageGpa = totalStudents > 0 ? (totalGpa / totalStudents) : 0;

    const byCourseAgg = await prisma.student.groupBy({
      by: ['course'],
      where: { userId: auth.userId },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    });
    const byCourse = byCourseAgg.map(g => ({ course: g.course, count: g._count.id }));

    const byMoodAgg = await prisma.student.groupBy({
      by: ['mood'],
      where: { userId: auth.userId },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    });
    const byMood = byMoodAgg.map(g => ({ mood: g.mood, count: g._count.id }));

    const byGenderAgg = await prisma.student.groupBy({
      by: ['gender'],
      where: { userId: auth.userId },
      _count: { id: true }
    });
    const byGender = byGenderAgg.map(g => ({ gender: g.gender, count: g._count.id }));

    let topStudent = null;
    if (totalStudents > 0) {
      const top = students.reduce((prev, current) => ((prev.gpa || 0) > (current.gpa || 0) ? prev : current));
      topStudent = { ...top, title: getStudentTitle(top.gpa || 0) };
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        totalStudents,
        activeStudents,
        averageGpa,
        graduatedStudents,
        byCourse,
        byMood,
        byGender,
        topStudent
      }
    }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
};
