import assert from "node:assert/strict";
import test from "node:test";

import registerAskMode from "../extensions/ask-mode.ts";

const ORIGINAL_TOOLS = ["read", "bash", "edit", "write", "grep", "find", "ls", "custom_mutator"];
const READ_ONLY_TOOLS = ["read", "grep", "find", "ls"];

function createHarness() {
	let activeTools = [...ORIGINAL_TOOLS];
	let sentQuestion;
	const commands = new Map();
	const handlers = new Map();
	const notifications = [];
	const statuses = [];

	const pi = {
		getAllTools: () => ORIGINAL_TOOLS.map((name) => ({ name })),
		getActiveTools: () => [...activeTools],
		setActiveTools(names) {
			activeTools = [...names];
		},
		registerCommand(name, command) {
			commands.set(name, command);
		},
		on(event, handler) {
			const eventHandlers = handlers.get(event) ?? [];
			handlers.set(event, [...eventHandlers, handler]);
		},
		sendUserMessage(question) {
			sentQuestion = question;
		},
	};

	registerAskMode(pi);

	const ctx = {
		ui: {
			notify(message, level) {
				notifications.push({ message, level });
			},
			setStatus(key, value) {
				statuses.push({ key, value });
			},
			theme: { fg: (_color, text) => text },
		},
	};

	async function emit(event, payload) {
		let result;
		for (const handler of handlers.get(event) ?? []) {
			const next = await handler(payload, ctx);
			if (next !== undefined) result = next;
		}
		return result;
	}

	return {
		command: commands.get("ask"),
		ctx,
		emit,
		get activeTools() {
			return activeTools;
		},
		get sentQuestion() {
			return sentQuestion;
		},
		notifications,
		statuses,
	};
}

test("/ask on 仅保留严格只读工具，/ask off 恢复原工具", async () => {
	const harness = createHarness();
	assert.ok(harness.command);

	await harness.command.handler("on", harness.ctx);
	assert.deepEqual(harness.activeTools, READ_ONLY_TOOLS);
	assert.equal(harness.statuses.at(-1).value, "ASK · 只读");

	await harness.command.handler("off", harness.ctx);
	assert.deepEqual(harness.activeTools, ORIGINAL_TOOLS);
	assert.equal(harness.statuses.at(-1).value, undefined);
});

test("Ask 模式阻止 bash、写工具和未知自定义工具", async () => {
	const harness = createHarness();
	await harness.command.handler("on", harness.ctx);

	assert.equal(await harness.emit("tool_call", { toolName: "read" }), undefined);
	for (const toolName of ["bash", "edit", "write", "custom_mutator"]) {
		const result = await harness.emit("tool_call", { toolName });
		assert.equal(result.block, true);
		assert.match(result.reason, new RegExp(toolName));
	}
});

test("/ask <问题> 开启只读并原样提交问题", async () => {
	const harness = createHarness();
	await harness.command.handler("解释这个模块", harness.ctx);

	assert.equal(harness.sentQuestion, "解释这个模块");
	assert.deepEqual(harness.activeTools, READ_ONLY_TOOLS);
});

test("每轮开始前重新收紧工具集并追加只读约束", async () => {
	const harness = createHarness();
	await harness.command.handler("on", harness.ctx);

	const result = await harness.emit("before_agent_start", { systemPrompt: "BASE" });
	assert.deepEqual(harness.activeTools, READ_ONLY_TOOLS);
	assert.ok(result.systemPrompt.startsWith("BASE"));
	assert.match(result.systemPrompt, /严格只读/);
	assert.match(result.systemPrompt, /shell/);
});
