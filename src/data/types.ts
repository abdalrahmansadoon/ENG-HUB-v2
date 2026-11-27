export interface Subject { id: string; name: string; nameEn: string; icon: string; order: number; year: string; term: string }

export type ItemCategory = 'lectures' | 'sheets' | 'exams' | 'resources';
export interface Item {
  id: string; subjectId: string; category: ItemCategory; title: string; url: string;
  /** اسم الدكتور أو المجلد، اختياري */
  group: string; createdAt: number;
}
export interface Progress { id: string; subjectId: string; at: number }

export type Priority = 'low' | 'normal' | 'high' | 'urgent';
export interface Attachment { name: string; url: string }

export interface Task {
  id: string; title: string; details: string; subjectId: string;
  /** YYYY-MM-DD */
  dueDate: string;
  /** ['all'] أو قائمة معرفات الأعضاء */
  audience: string[];
  createdBy: string; createdAt: number;
  // الحقول التالية اختيارية: المهام الأقدم لا تحملها.
  priority?: Priority; startDate?: string; links?: Attachment[];
  /** محاضرة أو ملف مرتبط، واختبار مرتبط */
  itemId?: string; quizId?: string;
  criteria?: string;
  /** تتطلب تسليم حل يراجعه المشرف */
  review?: boolean;
  noComments?: boolean; noResubmit?: boolean; cancelled?: boolean;
  /** يجمع نسخ المهمة المتكررة */
  seriesId?: string;
  /** مهمة خاصة محفوظة عند صاحبها وحده */
  personal?: boolean; done?: boolean; doneAt?: number;
}
export type ResponseStatus = 'accepted' | 'declined' | 'done' | 'submitted' | 'review' | 'rejected';
export interface TaskResponse {
  id: string; status: ResponseStatus; name: string; updatedAt: number;
  startedAt?: number;
  /** رقم آخر نسخة مسلّمة */
  version?: number; submittedAt?: number;
  reviewedBy?: string; reviewedAt?: number;
}
/** نسخة تسليم لا تتغير. يضيف المشرف إليها نتيجة مراجعته. */
export interface Submission {
  id: string; version: number; text: string; urls: string[]; names: string[]; link: string; at: number;
  verdict?: 'review' | 'done' | 'rejected'; reviewNote?: string; reviewedBy?: string; reviewedAt?: number;
}
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
