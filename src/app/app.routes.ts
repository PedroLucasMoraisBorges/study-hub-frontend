import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'topics/:topicId',
    loadComponent: () => import('./features/topic/topic.component').then((m) => m.TopicComponent),
  },
  {
    path: 'topics/:topicId/files/:fileId/doc',
    loadComponent: () =>
      import('./features/document/doc-editor.component').then((m) => m.DocEditorComponent),
  },
  {
    path: 'topics/:topicId/files/:fileId/cards',
    loadComponent: () =>
      import('./features/flashcard/flashcard-manage.component').then((m) => m.FlashcardManageComponent),
  },
  {
    path: 'topics/:topicId/files/:fileId/cards/review',
    loadComponent: () =>
      import('./features/flashcard/flashcard-review.component').then((m) => m.FlashcardReviewComponent),
  },
  {
    path: 'topics/:topicId/files/:fileId/slides',
    loadComponent: () => import('./features/slide/slide-grid.component').then((m) => m.SlideGridComponent),
  },
  {
    path: 'topics/:topicId/files/:fileId/mindmap',
    loadComponent: () => import('./features/mindmap/mindmap.component').then((m) => m.MindmapComponent),
  },
  { path: '**', redirectTo: '' },
];
