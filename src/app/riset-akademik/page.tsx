import React from 'react';
import { getAcademicResearch } from '@/data/research';
import RisetAkademikClient from './RisetAkademikClient';

export const metadata = {
  title: 'Riset Akademik Ketenagakerjaan',
  description: 'Temuan riset akademik terkini mengenai pasar kerja dan ketenagakerjaan di Indonesia (2020-2026).',
};

export default async function RisetAkademikPage() {
  const academicResearch = await getAcademicResearch();
  return <RisetAkademikClient initialData={academicResearch} />;
}
