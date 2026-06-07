/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface IPTVChannel {
  name: string;
  logo: string;
  group: string;
  url: string;
}

export interface PlaybackHistoryItem {
  name: string;
  logo: string;
  group: string;
  url: string;
  playedAt: number;
}

export interface CategoryStats {
  name: string;
  count: number;
}
