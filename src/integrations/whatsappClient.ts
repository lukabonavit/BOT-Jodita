import qrcode from "qrcode-terminal";
import { Client, LocalAuth, type Message } from "whatsapp-web.js";
import type { RuntimeEnv } from "../core/types.js";
import { MessageProcessor } from "../core/messageProcessor.js";
import { GroupRegistry } from "../storage/groupRegistry.js";
import { Logger } from "../utils/logger.js";

export class WhatsAppClient {
  private readonly client: Client;

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
      void this.refreshKnownGroups();
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

    void this.client.initialize();
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

  private async refreshKnownGroups(): Promise<void> {
    try {
      const chats = await this.client.getChats();
      const groups = chats
        .filter((chat) => chat.isGroup)
        .map((chat) => ({
          id: chat.id._serialized,
          name: chat.name,
          last_seen: new Date().toISOString()
        }));
      await this.groupRegistry.replace(groups);
      this.logger.info("WhatsApp groups loaded", { count: groups.length });
    } catch (error) {
      this.logger.warn("Could not list WhatsApp groups", {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}
