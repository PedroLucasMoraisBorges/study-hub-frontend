export interface Flashcard {
  id: number;
  order: number;
  front: string;
  back: string;
}

export interface FlashcardRequest {
  front: string;
  back: string;
}
