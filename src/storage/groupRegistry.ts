import fs from "node:fs/promises";
import path from "node:path";

export interface KnownWhatsAppGroup {
  id: string;
  name: string;
  last_seen: string;
}

export class GroupRegistry {
  private readonly filePath: string;
  private groups: KnownWhatsAppGroup[] = [];

  constructor(dataDir: string) {
    this.filePath = path.join(dataDir, "whatsapp-groups.json");
  }

  async init(): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      this.groups = JSON.parse(await fs.readFile(this.filePath, "utf8")) as KnownWhatsAppGroup[];
    } catch {
      this.groups = [];
      await this.flush();
    }
  }

  async replace(groups: KnownWhatsAppGroup[]): Promise<void> {
    this.groups = groups
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
    await this.flush();
  }

  async observe(group: KnownWhatsAppGroup): Promise<void> {
    const existing = this.groups.find((item) => item.id === group.id);
    if (existing) {
      existing.name = group.name;
      existing.last_seen = group.last_seen;
    } else {
      this.groups.push(group);
    }
    this.groups.sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
    await this.flush();
  }

  list(): KnownWhatsAppGroup[] {
    return this.groups;
  }

  private async flush(): Promise<void> {
    await fs.writeFile(this.filePath, `${JSON.stringify(this.groups, null, 2)}\n`, "utf8");
  }
}
