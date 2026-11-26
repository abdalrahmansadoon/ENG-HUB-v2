import type { Subject } from './types';

const base = { year: 'prep', term: '1' };
export const defaultSubjects: Subject[] = [
  { id: 'calculus-1', name: 'تفاضل وتكامل 1', nameEn: 'Calculus 1', icon: 'sigma', order: 1, ...base },
  { id: 'physics-1', name: 'فيزياء 1', nameEn: 'Physics 1', icon: 'atom', order: 2, ...base },
  { id: 'computer-science', name: 'علوم الحاسب', nameEn: 'Computer Science', icon: 'code', order: 3, ...base },
  { id: 'statics', name: 'استاتيكا', nameEn: 'Statics', icon: 'scale', order: 4, ...base },
  { id: 'algebra', name: 'جبر', nameEn: 'Algebra', icon: 'variable', order: 5, ...base },
  { id: 'critical-thinking', name: 'التفكير الناقد', nameEn: 'Critical Thinking', icon: 'bulb', order: 6, ...base },
  { id: 'technical-drawing', name: 'الرسم الهندسي', nameEn: 'Technical Drawing', icon: 'ruler', order: 7, ...base },
];
