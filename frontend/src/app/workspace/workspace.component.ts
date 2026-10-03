import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, EMPTY, startWith, switchMap } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { MarketDiaryApiService, Note, Share } from './market-diary-api.service';

@Component({
  selector: 'app-workspace',
  imports: [DatePipe, ReactiveFormsModule],
  template: `
    <div class="workspace-shell">
      <header class="topbar">
        <a class="brand" href="/workspace"><span class="brand-mark">M</span> Market Diary</a>
        <!-- AUTH-DISABLED: user menu and sign out
        <div class="topbar-user">
          <span class="user-avatar">{{ auth.currentUser()?.charAt(0)?.toUpperCase() }}</span>
          <span class="username">{{ auth.currentUser() }}</span>
          <button class="btn btn-ghost btn-sm" (click)="logout()">Sign out</button>
        </div>
        -->
      </header>

      <main class="workspace">
        <aside class="sidebar">
          <div class="section-heading">
            <div>
              <p class="eyebrow">YOUR PORTFOLIO</p>
              <h1>My shares <span class="count">{{ shares().length }}</span></h1>
            </div>
          </div>

          <label class="search-box">
            <span aria-hidden="true">⌕</span>
            <input
              class="input input-bordered"
              type="search"
              placeholder="Search shares"
              [formControl]="searchControl"
              aria-label="Search shares"
            />
            <kbd class="kbd kbd-sm">/</kbd>
          </label>

          <form [formGroup]="shareForm" (ngSubmit)="addShare()" class="add-share">
            <input
              class="input input-bordered"
              formControlName="name"
              placeholder="Add a share name"
              aria-label="Share name"
              maxlength="120"
            />
            <button class="btn btn-primary" type="submit" [disabled]="shareForm.invalid || addingShare()">
              {{ addingShare() ? 'Adding…' : 'Add' }}
            </button>
          </form>

          @if (shareError()) {
            <p class="inline-error" role="alert">{{ shareError() }}</p>
          }

          <div class="share-list" aria-label="Saved shares">
            @if (loadingShares()) {
              <div class="loading-state"><span class="loading loading-spinner loading-sm"></span> Loading shares…</div>
            } @else if (shares().length === 0) {
              <div class="list-empty">
                <span class="empty-icon">◌</span>
                <p>{{ searchControl.value ? 'No shares match your search.' : 'Your list is waiting.' }}</p>
                @if (!searchControl.value) {
                  <span>Add a share above to start your diary.</span>
                }
              </div>
            } @else {
              @for (share of shares(); track share.id) {
                <button
                  class="share-item"
                  [class.active]="selectedShare()?.id === share.id"
                  (click)="selectShare(share)"
                >
                  <span class="share-icon">{{ share.name.charAt(0).toUpperCase() }}</span>
                  <span class="share-name">{{ share.name }}</span>
                  <span class="share-chevron">›</span>
                </button>
              }
            }
          </div>
          <p class="sidebar-footnote">A thoughtful record beats a perfect prediction.</p>
        </aside>

        <section class="diary-panel">
          @if (notice()) {
            <div class="alert alert-success notice" role="status">{{ notice() }}</div>
          }
          @if (pageError()) {
            <div class="alert alert-error notice" role="alert">{{ pageError() }}</div>
          }

          @if (!selectedShare()) {
            <div class="welcome-state">
              <span class="welcome-mark">M</span>
              <p class="eyebrow">YOUR INVESTING JOURNAL</p>
              <h2>A little more clarity,<br />one note at a time.</h2>
              <p>Select a share to review your notes, or add one to begin.</p>
            </div>
          } @else {
            <div class="diary-content">
              <div class="diary-heading">
                <div>
                  <p class="eyebrow">SHARE DIARY</p>
                  <h2>{{ selectedShare()?.name }}</h2>
                  <p class="diary-subtitle">Your observations, gathered over time.</p>
                </div>
                <button class="btn btn-ghost btn-sm delete-share" (click)="deleteShare()">
                  Delete share
                </button>
              </div>

              <form [formGroup]="noteForm" (ngSubmit)="saveNote()" class="note-composer card">
                <div class="composer-top">
                  <div class="composer-label">
                    <span class="composer-icon">✎</span>
                    <div>
                      <h3>{{ editingNoteId() ? 'Edit note' : 'Add to your diary' }}</h3>
                      <p>What are you noticing about this share?</p>
                    </div>
                  </div>
                  @if (editingNoteId()) {
                    <button class="btn btn-ghost btn-sm" type="button" (click)="cancelEdit()">Cancel edit</button>
                  }
                </div>
                <textarea
                  class="textarea textarea-bordered"
                  formControlName="content"
                  placeholder="Write a thought, observation, or question…"
                  rows="4"
                  maxlength="10000"
                ></textarea>
                <div class="composer-bottom">
                  <label class="date-input">
                    <span>Date</span>
                    <input class="input input-bordered input-sm" type="date" formControlName="noteDate" />
                  </label>
                  <button class="btn btn-primary" type="submit" [disabled]="noteForm.invalid || savingNote()">
                    {{ savingNote() ? 'Saving…' : editingNoteId() ? 'Save changes' : 'Save note' }}
                  </button>
                </div>
              </form>

              <div class="timeline-heading">
                <h3>Recent notes <span class="count">{{ notes().length }}</span></h3>
                <span class="timeline-order">Newest first</span>
              </div>

              @if (loadingNotes()) {
                <div class="loading-state"><span class="loading loading-spinner loading-sm"></span> Loading notes…</div>
              } @else if (notes().length === 0) {
                <div class="notes-empty">
                  <span>☼</span>
                  <h3>Your first note starts here.</h3>
                  <p>Capture what you learn, what changes, and what you want to watch.</p>
                </div>
              } @else {
                <div class="timeline">
                  @for (note of notes(); track note.id) {
                    <article class="note-card">
                      <div class="timeline-marker"></div>
                      <div class="note-card-body">
                        <div class="note-meta">
                          <time>{{ note.noteDate | date: 'MMM d, y':'UTC' }}</time>
                          @if (note.updatedAt !== note.createdAt) {
                            <span class="edited-label">Edited</span>
                          }
                          <div class="note-actions">
                            <button class="btn btn-ghost btn-xs" (click)="editNote(note)">Edit</button>
                            <button class="btn btn-ghost btn-xs note-delete" (click)="deleteNote(note)">Delete</button>
                          </div>
                        </div>
                        <p class="note-content">{{ note.content }}</p>
                      </div>
                    </article>
                  }
                </div>
              }
            </div>
          }
        </section>
      </main>
    </div>
  `,
})
export class WorkspaceComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly api = inject(MarketDiaryApiService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly auth = inject(AuthService);

  readonly shares = signal<Share[]>([]);
  readonly notes = signal<Note[]>([]);
  readonly selectedShare = signal<Share | null>(null);
  readonly loadingShares = signal(true);
  readonly loadingNotes = signal(false);
  readonly addingShare = signal(false);
  readonly savingNote = signal(false);
  readonly editingNoteId = signal<number | null>(null);
  readonly shareError = signal('');
  readonly pageError = signal('');
  readonly notice = signal('');
  readonly searchControl = this.formBuilder.nonNullable.control('');
  readonly shareForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
  });
  readonly noteForm = this.formBuilder.nonNullable.group({
    content: ['', [Validators.required, Validators.maxLength(10000)]],
    noteDate: [this.today(), Validators.required],
  });

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(
        startWith(this.searchControl.value),
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((search) =>
          this.api.getShares(search.trim()).pipe(
            catchError((error: unknown) => {
              this.loadingShares.set(false);
              this.shareError.set(this.errorMessage(error));
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (shares) => {
          this.shares.set(shares);
          this.loadingShares.set(false);
        },
        error: (error: unknown) => {
          this.loadingShares.set(false);
          this.shareError.set(this.errorMessage(error));
        },
      });
  }

  addShare(): void {
    if (this.shareForm.invalid || this.addingShare()) {
      this.shareForm.markAllAsTouched();
      return;
    }
    this.addingShare.set(true);
    this.shareError.set('');
    const name = this.shareForm.controls.name.value.trim();
    this.api.createShare(name).subscribe({
      next: (share) => {
        this.shareForm.reset();
        this.addingShare.set(false);
        this.searchControl.setValue('');
        this.loadShares(share);
        this.setNotice(`${share.name} added to your list.`);
      },
      error: (error: unknown) => {
        this.addingShare.set(false);
        this.shareError.set(this.errorMessage(error));
      },
    });
  }

  selectShare(share: Share): void {
    this.selectedShare.set(share);
    this.notes.set([]);
    this.pageError.set('');
    this.cancelEdit();
    this.loadNotes(share.id);
  }

  deleteShare(): void {
    const share = this.selectedShare();
    if (!share || !window.confirm(`Delete ${share.name} and all its notes? This cannot be undone.`)) {
      return;
    }

    this.api.deleteShare(share.id).subscribe({
      next: () => {
        this.selectedShare.set(null);
        this.notes.set([]);
        this.loadShares();
        this.setNotice(`${share.name} and its notes were deleted.`);
      },
      error: (error: unknown) => this.pageError.set(this.errorMessage(error)),
    });
  }

  saveNote(): void {
    const share = this.selectedShare();
    if (!share || this.noteForm.invalid || this.savingNote()) {
      this.noteForm.markAllAsTouched();
      return;
    }

    const content = this.noteForm.controls.content.value.trim();
    if (!content) {
      this.noteForm.controls.content.setErrors({ required: true });
      return;
    }
    const { noteDate } = this.noteForm.getRawValue();
    const payload = { content, noteDate };
    const editingId = this.editingNoteId();
    this.savingNote.set(true);
    this.pageError.set('');
    const request = editingId
      ? this.api.updateNote(share.id, editingId, payload)
      : this.api.createNote(share.id, payload);

    request.subscribe({
      next: () => {
        this.savingNote.set(false);
        this.cancelEdit();
        this.loadNotes(share.id);
        this.setNotice(editingId ? 'Your note was updated.' : 'Your note was saved.');
      },
      error: (error: unknown) => {
        this.savingNote.set(false);
        this.pageError.set(this.errorMessage(error));
      },
    });
  }

  editNote(note: Note): void {
    this.editingNoteId.set(note.id);
    this.noteForm.setValue({ content: note.content, noteDate: note.noteDate });
    this.pageError.set('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.editingNoteId.set(null);
    this.noteForm.reset({ content: '', noteDate: this.today() });
  }

  deleteNote(note: Note): void {
    const share = this.selectedShare();
    if (!share || !window.confirm('Delete this note? This cannot be undone.')) {
      return;
    }

    this.api.deleteNote(share.id, note.id).subscribe({
      next: () => {
        this.loadNotes(share.id);
        this.setNotice('Your note was deleted.');
      },
      error: (error: unknown) => this.pageError.set(this.errorMessage(error)),
    });
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }

  private loadShares(select?: Share): void {
    this.loadingShares.set(true);
    this.shareError.set('');
    this.api.getShares(this.searchControl.value.trim()).subscribe({
      next: (shares) => {
        this.shares.set(shares);
        this.loadingShares.set(false);
        if (select) {
          const created = shares.find((share) => share.id === select.id) ?? select;
          this.selectShare(created);
        }
      },
      error: (error: unknown) => {
        this.loadingShares.set(false);
        this.shareError.set(this.errorMessage(error));
      },
    });
  }

  private loadNotes(shareId: number): void {
    this.loadingNotes.set(true);
    this.api.getNotes(shareId).subscribe({
      next: (notes) => {
        if (this.selectedShare()?.id === shareId) {
          this.notes.set(notes);
          this.loadingNotes.set(false);
        }
      },
      error: (error: unknown) => {
        this.loadingNotes.set(false);
        this.pageError.set(this.errorMessage(error));
      },
    });
  }

  private setNotice(message: string): void {
    this.notice.set(message);
    window.setTimeout(() => {
      if (this.notice() === message) {
        this.notice.set('');
      }
    }, 3500);
  }

  private errorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 0) {
      return 'Unable to reach the server. Check your connection and try again.';
    }
    if (error instanceof HttpErrorResponse && error.status === 404) {
      return 'This item no longer exists. Refresh the list and try again.';
    }
    return 'Could not complete that action. Please try again.';
  }

  private today(): string {
    const date = new Date();
    const offset = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 10);
  }
}
