import type { IncomingMessageContext } from "../core/types.js";

export interface SourceAdapter {
  name: string;
  start(onMessage: (message: IncomingMessageContext) => Promise<void>): Promise<void> | void;
}

export interface OcrAdapter {
  extractTextFromImage(inputPath: string): Promise<string>;
}

export interface AudioTranscriptionAdapter {
  transcribeAudio(inputPath: string): Promise<string>;
}

export interface ScreenshotAnalyzer {
  analyzeScreenshot(inputPath: string): Promise<string>;
}

export class InstagramPublicSource implements SourceAdapter {
  name = "instagram-public";

  start(): void {
    throw new Error("Instagram public source is a future adapter. Use Playwright with explicit targets.");
  }
}

export class BomboDeepLinkSource implements SourceAdapter {
  name = "bombo-deeplink";

  start(): void {
    throw new Error("BOMBO source is mobile/deep-link first; do not assume stable public web scraping.");
  }
}
