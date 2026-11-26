export interface Subject { id: string; name: string; nameEn: string; icon: string; order: number; year: string; term: string }

export type ItemCategory = 'lectures' | 'sheets' | 'exams' | 'resources';
export interface Item {
  id: string; subjectId: string; category: ItemCategory; title: string; url: string;
  /** اسم الدكتور أو المجلد، اختياري */
  group: string; createdAt: number;
}
export interface Progress { id: string; subjectId: string; at: number }

export interface Task {
  id: string; title: string; details: string; subjectId: string;
  /** YYYY-MM-DD */
  dueDate: string;
  /** ['all'] أو قائمة معرفات الأعضاء */
  audience: string[];
  createdBy: string; createdAt: number;
}
export type ResponseStatus = 'accepted' | 'declined' | 'done';
export interface TaskResponse { id: string; status: ResponseStatus; name: string; updatedAt: number }
export interface Comment { id: string; uid: string; name: string; text: string; createdAt: number }

export interface Profile { id: string; name: string; photoURL: string }

export interface Message { id: string; uid: string; name: string; text: string; imageUrl: string; replyTo: string; createdAt: number }
export interface Room { id: string; locked: boolean }
export interface Mute { id: string; name: string }

export interface Question { text: string; imageUrl: string; options: string[] }
export interface Quiz {
  id: string; title: string; subjectId: string; kind: 'mcq' | 'pdf'; pdfUrl: string;
  questions: Question[]; published: boolean; createdAt: number;
}
export interface AnswerKey { id: string; answers: number[] }
export interface Attempt { id: string; name: string; answers: number[]; submittedAt: number }
