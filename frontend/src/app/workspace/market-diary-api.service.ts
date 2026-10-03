import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface Share {
  id: number;
  name: string;
  createdAt: string;
}

export interface Note {
  id: number;
  shareId: number;
  content: string;
  noteDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaveNote {
  content: string;
  noteDate: string;
}

@Injectable({ providedIn: 'root' })
export class MarketDiaryApiService {
  private readonly http = inject(HttpClient);

  getShares(search: string): Observable<Share[]> {
    const params = search ? new HttpParams().set('search', search) : new HttpParams();
    return this.http.get<Share[]>('/api/shares', { params });
  }

  createShare(name: string): Observable<Share> {
    return this.http.post<Share>('/api/shares', { name });
  }

  deleteShare(shareId: number): Observable<void> {
    return this.http.delete<void>(`/api/shares/${shareId}`);
  }

  getNotes(shareId: number): Observable<Note[]> {
    return this.http.get<Note[]>(`/api/shares/${shareId}/notes`);
  }

  createNote(shareId: number, note: SaveNote): Observable<Note> {
    return this.http.post<Note>(`/api/shares/${shareId}/notes`, note);
  }

  updateNote(shareId: number, noteId: number, note: SaveNote): Observable<Note> {
    return this.http.put<Note>(`/api/shares/${shareId}/notes/${noteId}`, note);
  }

  deleteNote(shareId: number, noteId: number): Observable<void> {
    return this.http.delete<void>(`/api/shares/${shareId}/notes/${noteId}`);
  }
}
