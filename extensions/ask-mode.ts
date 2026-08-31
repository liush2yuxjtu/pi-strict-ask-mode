import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

const READ_ONLY_TOOLS = new Set(["read", "grep", "find", "ls"]);

export default function askMode(pi: ExtensionAPI): void {
	let enabled = false;
	let previousTools: string[] = [];

	function readOnlyTools(): string[] {
		return pi
			.getAllTools()
			.map((tool) => tool.name)
			.filter((name) => READ_ONLY_TOOLS.has(name));
	}

	function updateStatus(ctx: ExtensionContext): void {
		ctx.ui.setStatus("ask-mode", enabled ? ctx.ui.theme.fg("warning", "ASK · 只读") : undefined);
	}

	function enable(ctx: ExtensionContext): void {
		if (!enabled) {
			previousTools = pi.getActiveTools();
			enabled = true;
			pi.setActiveTools(readOnlyTools());
		}
		updateStatus(ctx);
		ctx.ui.notify("Ask 模式已开启：模型仅可使用 read、grep、find、ls。", "info");
	}

	function disable(ctx: ExtensionContext): void {
		if (enabled) {
			const available = new Set(pi.getAllTools().map((tool) => tool.name));
			pi.setActiveTools(previousTools.filter((name) => available.has(name)));
			enabled = false;
			previousTools = [];
		}
		updateStatus(ctx);
		ctx.ui.notify("Ask 模式已关闭：已恢复之前的工具集。", "info");
	}

	pi.registerCommand("ask", {
		description: "切换严格只读 Ask 模式，或使用 /ask <问题>",
		handler: async (args, ctx) => {
			const input = args.trim();

			if (input === "status") {
				ctx.ui.notify(`Ask 模式当前${enabled ? "已开启" : "未开启"}。`, "info");
				return;
			}
			if (input === "on") {
				enable(ctx);
				return;
			}
			if (input === "off") {
				disable(ctx);
				return;
			}
			if (!input) {
				if (enabled) disable(ctx);
				else enable(ctx);
				return;
			}

			enable(ctx);
			pi.sendUserMessage(input);
		},
	});

	pi.on("before_agent_start", (event) => {
		if (!enabled) return;
		pi.setActiveTools(readOnlyTools());
		return {
			systemPrompt: `${event.systemPrompt}\n\n[ASK 模式：严格只读]\n只允许回答、检查、搜索和解释。禁止修改文件、运行 shell 命令，禁止调用 read、grep、find、ls 以外的工具。用户要求修改时，说明需先使用 /ask off 关闭 Ask 模式。`,
		};
	});

	pi.on("tool_call", (event) => {
		if (!enabled || READ_ONLY_TOOLS.has(event.toolName)) return;
		return {
			block: true,
			reason: `Ask 模式已阻止非只读工具：${event.toolName}。使用 /ask off 恢复之前的工具。`,
		};
	});
}
