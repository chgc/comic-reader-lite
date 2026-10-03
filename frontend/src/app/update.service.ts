import { Injectable, inject, signal } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { fromEvent, interval } from 'rxjs';
import { filter } from 'rxjs/operators';

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour (was 6h — checks are cheap, just ngsw.json)

@Injectable({ providedIn: 'root' })
export class UpdateService {
  private readonly swUpdate = inject(SwUpdate);

  readonly updateAvailable = signal(false);

  constructor() {
    if (!this.swUpdate.isEnabled) return;

    this.swUpdate.versionUpdates
      .pipe(filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'))
      .subscribe(() => this.updateAvailable.set(true));

    this.swUpdate.unrecoverable.subscribe(() => document.location.reload());

    // Proactive checks: on app start, when the tab regains focus, and periodically.
    // checkForUpdate() rejects until the service worker is registered/active — ignore those.
    this.checkForUpdate();
    fromEvent(document, 'visibilitychange').subscribe(() => {
      if (document.visibilityState === 'visible') this.checkForUpdate();
    });
    interval(UPDATE_CHECK_INTERVAL_MS).subscribe(() => this.checkForUpdate());
  }

  applyUpdate(): void {
    this.swUpdate.activateUpdate().then(() => document.location.reload());
  }

  private checkForUpdate(): void {
    this.swUpdate.checkForUpdate().catch(() => undefined);
  }
}