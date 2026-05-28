import { OpenAiAnalyzer } from "./ai/openaiAnalyzer.js";
import { ConfigService } from "./config/configService.js";
import { loadEnv } from "./config/env.js";
import { CooldownManager } from "./core/cooldown.js";
import { MessageProcessor } from "./core/messageProcessor.js";
import { ConsoleNotifier, type Notifier } from "./core/notifier.js";
import { TelegramAlertBot } from "./integrations/telegramBot.js";
import { WhatsAppClient } from "./integrations/whatsappClient.js";
import { PatternMemory } from "./learning/patternMemory.js";
import { GroupRegistry } from "./storage/groupRegistry.js";
import { JsonlStore } from "./storage/jsonlStore.js";
import { Logger } from "./utils/logger.js";

async function main(): Promise<void> {
  const env = loadEnv();
  const logger = new Logger(env.logLevel);
  const configService = new ConfigService(env);
  await configService.load();

  const store = new JsonlStore(env.dataDir);
  await store.init();

  const memory = new PatternMemory(env.dataDir);
  await memory.init();

  const groupRegistry = new GroupRegistry(env.dataDir);
  await groupRegistry.init();

  let refreshWhatsAppGroups: (() => Promise<number>) | null = null;

  const telegram = new TelegramAlertBot(
    env,
    configService,
    store,
    memory,
    groupRegistry,
    () => refreshWhatsAppGroups?.() ?? Promise.resolve(0),
    logger
  );
  telegram.start();

  const notifier: Notifier = env.telegramBotToken ? telegram : new ConsoleNotifier();
  const analyzer = new OpenAiAnalyzer(env, logger);
  const cooldown = new CooldownManager(env);
  const processor = new MessageProcessor(
    configService,
    analyzer,
    store,
    memory,
    cooldown,
    notifier,
    logger,
    env.defaultTimezone
  );

  const whatsapp = new WhatsAppClient(env, processor, groupRegistry, logger);
  refreshWhatsAppGroups = () => whatsapp.refreshKnownGroups();
  whatsapp.start();

  logger.info("BOT Jodita started", {
    configDir: env.configDir,
    dataDir: env.dataDir,
    timezone: env.defaultTimezone
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
