import qrcode from "qrcode-terminal";
import whatsappWeb from "whatsapp-web.js";
import type { Client as WhatsAppWebClient, Message } from "whatsapp-web.js";
import type { RuntimeEnv } from "../core/types.js";
import { MessageProcessor } from "../core/messageProcessor.js";
import { GroupRegistry } from "../storage/groupRegistry.js";
import { Logger } from "../utils/logger.js";

const { Client, LocalAuth } = whatsappWeb;

export class WhatsAppClient {
  private readonly client: WhatsAppWebClient;
  private refreshingGroups = false;

  constructor(
    private readonly env: RuntimeEnv,
    private readonly processor: MessageProcessor,
    private readonly groupRegistry: GroupRegistry,
    private readonly logger: Logger
  ) {
    this.client = new Client({
      authStrategy: new LocalAuth({ clientId: env.whatsappSessionName }),
      puppeteer: {
        headless: env.whatsappHeadless,
        executablePath: env.puppeteerExecutablePath,
        protocolTimeout: 120000,
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
      }
    });
  }

  start(): void {
    if (!this.env.whatsappEnabled) {
      this.logger.warn("WhatsApp disabled by WHATSAPP_ENABLED=false");
      return;
    }

    this.client.on("qr", (qr) => {
      this.logger.info("Scan WhatsApp QR below");
      qrcode.generate(qr, { small: true });
    });

    this.client.on("ready", () => {
      this.logger.info("WhatsApp Web ready");
      this.scheduleKnownGroupRefreshes();
    });

    this.client.on("auth_failure", (message) => {
      this.logger.error("WhatsApp auth failure", { message });
    });

    this.client.on("disconnected", (reason) => {
      this.logger.warn("WhatsApp disconnected", { reason });
    });

    this.client.on("message", (message) => {
      void this.handleMessage(message);
    });

    if (this.env.puppeteerExecutablePath) {
      this.logger.info("Using browser for WhatsApp", {
        executablePath: this.env.puppeteerExecutablePath
      });
    }

    this.client.initialize().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("Could not find Chrome")) {
        this.logger.error(
          "WhatsApp could not start because Chrome/Chromium was not found. Install Google Chrome or set PUPPETEER_EXECUTABLE_PATH in .env.",
          { error: message }
        );
        return;
      }
      this.logger.error("WhatsApp could not start", { error: message });
    });
  }

  private async handleMessage(message: Message): Promise<void> {
    try {
      const chat = await message.getChat();
      if (!chat.isGroup) return;
      await this.groupRegistry.observe({
        id: chat.id._serialized,
        name: chat.name,
        last_seen: new Date().toISOString()
      });

      const contact = await message.getContact();
      await this.processor.process({
        id: message.id._serialized,
        source: "whatsapp",
        rawMessage: message.body ?? "",
        groupName: chat.name,
        chatId: chat.id._serialized,
        senderName: contact.pushname || contact.name || contact.number,
        senderId: contact.id._serialized,
        timestamp: new Date((message.timestamp || Math.floor(Date.now() / 1000)) * 1000).toISOString()
      });
    } catch (error) {
      this.logger.error("Failed to process WhatsApp message", {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async refreshKnownGroups(): Promise<number> {
    if (this.refreshingGroups) {
      return this.groupRegistry.list().length;
    }

    this.refreshingGroups = true;
    try {
      const chats = await this.client.getChats();
      const groups = chats
        .filter((chat) => chat.isGroup)
        .map((chat) => ({
          id: chat.id._serialized,
          name: chat.name,
          last_seen: new Date().toISOString()
        }));

      if (groups.length > 0) {
        await this.groupRegistry.replace(groups);
      }

      this.logger.info("WhatsApp groups loaded", { count: groups.length });
      return groups.length;
    } catch (error) {
      this.logger.warn("Could not list WhatsApp groups", {
        error: error instanceof Error ? error.message : String(error)
      });
      return 0;
    } finally {
      this.refreshingGroups = false;
    }
  }

  private scheduleKnownGroupRefreshes(): void {
    const delays = [0, 5000, 20000, 60000];
    for (const delay of delays) {
      setTimeout(() => {
        void this.refreshKnownGroups();
      }, delay);
    }
  }
}
