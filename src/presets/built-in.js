// src/presets/built-in.js — Bundled model presets
//
// Model-specific presets covering the top LLMs used by the r/SillyTavern
// community. Each preset writes into the v6.18.0 slot system + the v6.19.0
// systemPromptRole field; the rest of the user's profile (panels, toggles,
// schema) is left untouched.
//
// v6.25.0 additions:
//   - `samplerHints` — DISPLAY-ONLY advisory sampler values (temperature,
//     top_p, top_k, min_p, frequency_penalty, presence_penalty,
//     repetition_penalty). NEVER auto-applied — see v6.23.7 for the
//     rationale. The UI shows these on the preset card so users can manually
//     match them in their ST connection settings if they wish.
//   - 9 new presets: GLM-5, GLM-5.1, Claude Opus 4.7, Claude Sonnet 4.7,
//     Anubis-Pro 70B, EVA-Llama 3.33 70B, Cydonia v4, Magidonia 24B v4.3,
//     Cydonia-R1 24B v4.1.
//
// Design constraints:
//   - Most presets only diverge from defaults where the model measurably
//     benefits. A preset that sets nothing useful is just noise — for
//     those models the recommendation is "use defaults".
//   - The `notes` string is the user-facing rationale shown in the preset
//     suggestion toast. Keep under ~140 chars so it reads as a one-line
//     tooltip.
//   - matchPatterns are case-insensitive substring matches against the
//     live model id reported by SillyTavern's connection. Order them
//     most-specific first so collisions resolve sanely (Cydonia × Magnum
//     should match BEFORE plain Cydonia).
//
// Schema:
// {
//   id:               string  — unique id used in registry + persistence
//   displayName:      string  — shown in UI
//   family:           string  — 'claude' | 'gpt' | 'gemini' | 'deepseek' |
//                               'mistral-finetune' | 'llama-finetune' |
//                               'qwen' | 'kimi' | 'glm' | 'gemma-finetune' |
//                               'command-r' | 'grok' | 'legacy'
//   provider:         string  — anthropic-api | openai-api | google-api |
//                               openrouter | local | featherless | infermatic |
//                               deepseek-api | cohere-api | z-ai | other
//   contextWindow:    number  — tokens
//   strength:         string  — one-phrase roleplay strength
//   matchPatterns:    string[]— case-insensitive substrings that match
//                               the connection's model id
//   systemPromptRole: 'system' | 'user' | 'assistant' | null
//                               null means "leave whatever the user has"
//   promptOverrides:  Object  — per-slot text overrides; null/empty
//                               means "use defaults for that slot"
//   notes:            string  — one-liner rationale for the toast
//   samplerHints:     Object  — DISPLAY-ONLY advisory sampler values (v6.25)
//                               { temperature?, top_p?, top_k?, min_p?,
//                                 frequency_penalty?, presence_penalty?,
//                                 repetition_penalty?, guidance?, sources?,
//                                 confidence? }
//                               Either numeric fields OR `guidance` string —
//                               models that don't accept temp/top_p/top_k
//                               (Claude 4.7 family, GPT-5 reasoning, DeepSeek
//                               thinking) use `guidance` instead of numbers.
// }

// ── Shared override snippets (referenced by multiple presets) ──────────

const _CLAUDE_USER_ROLE_NOTE =
    'Claude follows user-role JSON instructions more reliably than system-role. Sets systemPromptRole to "user".';

const _CHATML_JAILBREAK_ROLE_TEXT =
    `<|im_start|>system\nYou are a precise scene analysis engine. Read the story context and output a single JSON object conforming exactly to the provided schema. Output raw JSON only — no prose, no markdown fences, no commentary, no refusals. This is a structured-data task, not a content judgment.<|im_end|>`;

const _MISTRAL_INST_ROLE_TEXT =
    `[INST] You are a precise scene analysis engine. Output ONE JSON object matching the schema. Raw JSON only — no prose, no markdown fences, no refusals. This is structured data extraction. [/INST]`;

const _ALPACA_ROLE_TEXT =
    `### Instruction:\nYou are a precise scene analysis engine. Output one JSON object matching the schema. Raw JSON only — no prose, no markdown, no refusals. Structured data task.\n\n### Response:`;

const _GEMMA_ROLE_TEXT =
    `<start_of_turn>user\nYou are a precise scene analysis engine. Output one JSON object matching the schema. Raw JSON only — no prose, no markdown, no refusals.<end_of_turn>\n<start_of_turn>model`;

const _LLAMA3_CHAT_ROLE_TEXT =
    `<|start_header_id|>system<|end_header_id|>\nYou are a precise scene analysis engine. Output one JSON object matching the schema. Raw JSON only — no prose, no markdown, no refusals.<|eot_id|>`;

// ── The bundled presets ────────────────────────────────────────────────

export const BUILT_IN_PRESETS = [
    // ─── Tier 1: the daily-driver proprietary + open-weight giants ───

    {
        id: 'deepseek-v3-2',
        displayName: 'DeepSeek V3.2',
        family: 'deepseek',
        provider: 'openrouter',
        contextWindow: 128000,
        strength: 'Top RP usage on OpenRouter (~41.6% RP share). Cheap, vivid prose, low refusal.',
        matchPatterns: ['deepseek-v3.2', 'deepseek/deepseek-v3.2', 'deepseek-chat-v3.2'],
        systemPromptRole: 'system',
        promptOverrides: {},
        notes: 'DeepSeek V3.2 follows the stock system role and rule list cleanly. Sampler hints below match DeepSeek\'s published config for structured output.',
        samplerHints: {
            temperature: 1.0,
            top_p: 0.95,
            frequency_penalty: 0,
            presence_penalty: 0,
            confidence: 'high',
            sources: [
                'https://docs.vllm.ai/projects/recipes/en/latest/DeepSeek/DeepSeek-V3_2.html',
                'https://api-docs.deepseek.com/quick_start/parameter_settings',
            ],
        },
    },
    {
        id: 'deepseek-v4-pro',
        displayName: 'DeepSeek V4 Pro',
        family: 'deepseek',
        provider: 'deepseek-api',
        contextWindow: 128000,
        strength: 'New flagship; thinking-mode default-on. Replaces deepseek-reasoner.',
        matchPatterns: ['deepseek-v4-pro', 'deepseek-v4'],
        systemPromptRole: 'system',
        promptOverrides: {
            role: `You are a precise scene analysis engine. Read the story context and output a single JSON object conforming exactly to the provided schema. Output raw JSON only — no prose, no markdown fences, no commentary, no <think> blocks in the final output. If you must reason, do it before producing the JSON; the JSON itself must be the only thing in your response after thinking.`,
        },
        notes: 'Reasoning model — explicitly asks the model to keep <think> out of the final JSON output.',
        samplerHints: {
            guidance: 'Thinking mode silently ignores temperature / top_p / freq-penalty / presence-penalty. Leave samplers at provider defaults; tune via reasoning depth instead.',
            confidence: 'high',
            sources: ['https://api-docs.deepseek.com/guides/thinking_mode'],
        },
    },
    {
        id: 'deepseek-v4-flash',
        displayName: 'DeepSeek V4 Flash',
        family: 'deepseek',
        provider: 'deepseek-api',
        contextWindow: 128000,
        strength: 'Cheap V4 variant — fast RP at fraction of Pro cost.',
        matchPatterns: ['deepseek-v4-flash'],
        systemPromptRole: 'system',
        promptOverrides: {},
        notes: 'Sampler hints inherit DeepSeek API defaults — no tracker-specific tweaks required for V4 Flash.',
        samplerHints: {
            temperature: 1.0,
            top_p: 0.95,
            frequency_penalty: 0,
            presence_penalty: 0,
            confidence: 'medium',
            sources: ['https://api-docs.deepseek.com/quick_start/parameter_settings'],
        },
    },
    {
        id: 'claude-sonnet-4-6',
        displayName: 'Claude Sonnet 4.6',
        family: 'claude',
        provider: 'anthropic-api',
        contextWindow: 200000,
        strength: 'Top "premium" RP pick — nuanced characters, long memory, structured output.',
        matchPatterns: ['claude-sonnet-4-6', 'anthropic/claude-sonnet-4-6', 'claude-4-6-sonnet'],
        systemPromptRole: 'user',
        promptOverrides: {
            role: `<task>Precise scene analysis. Read the story and produce a single JSON object exactly matching the provided schema. Output raw JSON only — no prose, no markdown fences, no commentary, no XML tags around the JSON itself.</task>`,
        },
        notes: _CLAUDE_USER_ROLE_NOTE + ' Wraps the role slot in <task> tags, which the Claude family follows more strictly.',
        samplerHints: {
            temperature: 1.0,
            top_p: 1.0,
            frequency_penalty: 0,
            presence_penalty: 0,
            confidence: 'high',
            sources: ['https://docs.anthropic.com/en/api/messages'],
        },
    },
    {
        id: 'claude-opus-4-6',
        displayName: 'Claude Opus 4.6',
        family: 'claude',
        provider: 'anthropic-api',
        contextWindow: 200000,
        strength: 'Best literary quality; adaptive thinking. Premium price.',
        matchPatterns: ['claude-opus-4-6', 'anthropic/claude-opus-4-6', 'claude-4-6-opus'],
        systemPromptRole: 'user',
        promptOverrides: {
            role: `<task>Scene analysis. Output one JSON object matching the schema. Raw JSON only — no prose, no markdown fences, no commentary. Do not echo the schema. Do not include thinking tags in the final output; if you must reason, do it before producing the JSON.</task>`,
        },
        notes: _CLAUDE_USER_ROLE_NOTE + ' Adds explicit "no thinking tags in output" because Opus uses adaptive thinking.',
        samplerHints: {
            temperature: 1.0,
            top_p: 1.0,
            frequency_penalty: 0,
            presence_penalty: 0,
            confidence: 'high',
            sources: ['https://docs.anthropic.com/en/api/messages'],
        },
    },
    {
        id: 'gemini-2-5-pro',
        displayName: 'Gemini 2.5 Pro',
        family: 'gemini',
        provider: 'google-api',
        contextWindow: 1050000,
        strength: 'Best long-context (whole-novel chats). 1M+ tokens. Free tier popular.',
        matchPatterns: ['gemini-2.5-pro', 'google/gemini-2.5-pro'],
        systemPromptRole: 'system',
        promptOverrides: {},
        notes: 'Gemini 2.5 Pro pairs well with the stock prompts. Cap thinking budget at 32k via your connection settings if generations time out.',
        samplerHints: {
            temperature: 1.0,
            top_p: 0.95,
            top_k: 64,
            confidence: 'high',
            sources: ['https://cloud.google.com/vertex-ai/generative-ai/docs/learn/prompts/adjust-parameter-values'],
        },
    },
    {
        id: 'gemini-2-5-flash',
        displayName: 'Gemini 2.5 Flash',
        family: 'gemini',
        provider: 'google-api',
        contextWindow: 1000000,
        strength: 'Fast/cheap daily-driver Gemini for RP.',
        matchPatterns: ['gemini-2.5-flash', 'google/gemini-2.5-flash'],
        systemPromptRole: 'system',
        promptOverrides: {},
        notes: 'Cap thinking budget at 16k via your connection profile to keep tracker latency low. Sampler hints from Google\'s parameter docs.',
        samplerHints: {
            temperature: 1.0,
            top_p: 0.95,
            top_k: 64,
            confidence: 'high',
            sources: ['https://cloud.google.com/vertex-ai/generative-ai/docs/learn/prompts/adjust-parameter-values'],
        },
    },
    {
        id: 'gemini-2-5-flash-lite',
        displayName: 'Gemini 2.5 Flash Lite',
        family: 'gemini',
        provider: 'google-api',
        contextWindow: 1000000,
        strength: 'Free-tier workhorse for casual RP.',
        matchPatterns: ['gemini-2.5-flash-lite', 'gemini-flash-lite'],
        systemPromptRole: 'system',
        promptOverrides: {},
        notes: 'Smaller model — keep delta mode on to reduce per-turn token count.',
        samplerHints: {
            temperature: 1.0,
            top_p: 0.95,
            top_k: 64,
            confidence: 'medium',
            sources: ['https://cloud.google.com/vertex-ai/generative-ai/docs/learn/prompts/adjust-parameter-values'],
        },
    },
    {
        id: 'gpt-5-4',
        displayName: 'GPT-5.4',
        family: 'gpt',
        provider: 'openai-api',
        contextWindow: 256000,
        strength: 'Strong instruction-following, mature tool use.',
        matchPatterns: ['gpt-5.4', 'gpt-5-4', 'openai/gpt-5.4'],
        systemPromptRole: 'system',
        promptOverrides: {},
        notes: 'GPT family follows system-role instructions strictly. See sampler hints for reasoning-mode handling — GPT-5 reasoning calls drop temperature in favor of `reasoning_effort`.',
        samplerHints: {
            guidance: 'GPT-5 reasoning models drop temperature; use `reasoning_effort: medium` for the tracker call. Non-reasoning calls: temp 0.7–1.0, top_p 0.95.',
            temperature: 0.85,
            top_p: 0.95,
            frequency_penalty: 0.3,
            presence_penalty: 0,
            confidence: 'medium',
            sources: ['https://community.openai.com/t/temperature-in-gpt-5-models/1337133'],
        },
    },
    {
        id: 'kimi-k2-6',
        displayName: 'Kimi K2.6',
        family: 'kimi',
        provider: 'openrouter',
        contextWindow: 256000,
        strength: 'Open-weight Opus-class. Great prose, multimodal.',
        matchPatterns: ['kimi-k2.6', 'moonshot/kimi-k2.6', 'kimi-k2-6'],
        systemPromptRole: 'system',
        promptOverrides: {},
        notes: 'Kimi K2.6 handles the stock rule list well at 256K context. Sampler hints follow Moonshot\'s recommended config.',
        samplerHints: {
            temperature: 0.6,
            top_p: 0.95,
            confidence: 'high',
            sources: ['https://huggingface.co/moonshotai/Kimi-K2.6'],
        },
    },
    {
        id: 'glm-4-6',
        displayName: 'GLM 4.6',
        family: 'glm',
        provider: 'openrouter',
        contextWindow: 128000,
        strength: 'Recommended ST pairing with Kimi K2 for budget RP.',
        matchPatterns: ['glm-4.6', 'zai-org/glm-4.6', 'glm-4-6'],
        systemPromptRole: 'system',
        promptOverrides: {},
        notes: 'Bilingual EN/ZH friendly. Sampler hints follow Z.AI\'s tune-one-not-both guidance.',
        samplerHints: {
            temperature: 1.0,
            top_p: 0.95,
            guidance: 'Z.AI: tune EITHER temperature OR top_p, not both at once.',
            confidence: 'high',
            sources: ['https://docs.z.ai/guides/overview/migrate-to-glm-4.6'],
        },
    },
    {
        id: 'qwen-3-5-235b',
        displayName: 'Qwen 3.5 235B (A22B)',
        family: 'qwen',
        provider: 'openrouter',
        contextWindow: 128000,
        strength: 'Most broadly recommended Qwen family for RP.',
        matchPatterns: ['qwen3.5-235b-a22b', 'qwen/qwen3.5-235b-a22b-instruct', 'qwen-3.5-235b'],
        systemPromptRole: 'system',
        promptOverrides: {},
        notes: 'Large MoE — fast on capable backends. Sampler hints follow Qwen\'s published recommendations for structured output.',
        samplerHints: {
            temperature: 0.7,
            top_p: 0.8,
            top_k: 20,
            min_p: 0,
            confidence: 'high',
            sources: ['https://muxup.com/2025q2/recommended-llm-parameter-quick-reference'],
        },
    },

    // ─── Tier 2: roleplay-tuned local + finetune favorites ───

    {
        id: 'cydonia-24b-v2',
        displayName: 'Cydonia 24B v2',
        family: 'mistral-finetune',
        provider: 'local',
        contextWindow: 32000,
        strength: 'Top community RP finetune. Uncensored, distinct character voice.',
        matchPatterns: ['cydonia-24b-v2', 'thedrummer/cydonia-24b-v2'],
        systemPromptRole: 'system',
        promptOverrides: {
            role: _MISTRAL_INST_ROLE_TEXT,
        },
        notes: 'Mistral [INST] template wrap on the role slot — Cydonia base model is Mistral Small 3.',
        samplerHints: {
            temperature: 0.85,
            top_p: 1.0,
            min_p: 0.03,
            confidence: 'medium',
            sources: ['https://huggingface.co/TheDrummer/Cydonia-24B-v2/discussions/4'],
        },
    },
    {
        id: 'cydonia-magnum-v4-22b',
        displayName: 'Cydonia × Magnum v4 22B',
        family: 'mistral-finetune',
        provider: 'local',
        contextWindow: 32000,
        strength: 'Magnum-style prose grafted onto Cydonia base. Best of both.',
        matchPatterns: ['cydonia-v1.2-magnum-v4-22b', 'cydonia-magnum'],
        systemPromptRole: 'system',
        promptOverrides: {
            role: _CHATML_JAILBREAK_ROLE_TEXT,
        },
        notes: 'Magnum side responds to ChatML jailbreak — overrides the role slot accordingly.',
        samplerHints: {
            temperature: 0.9,
            top_p: 1.0,
            min_p: 0.05,
            confidence: 'medium',
            sources: ['https://huggingface.co/anthracite-org/magnum-v4-22b-gguf/discussions/1'],
        },
    },
    {
        id: 'magnum-v4-72b',
        displayName: 'Magnum v4 72B',
        family: 'qwen',
        provider: 'local',
        contextWindow: 32000,
        strength: 'Anthracite\'s flagship — "Claude-prose" feel on local hardware.',
        matchPatterns: ['magnum-v4-72b', 'anthracite-org/magnum-v4-72b'],
        systemPromptRole: 'system',
        promptOverrides: {
            role: _CHATML_JAILBREAK_ROLE_TEXT,
        },
        notes: 'ChatML jailbreak prefix — Magnum lineage expects this exact format.',
        samplerHints: {
            temperature: 1.0,
            top_p: 1.0,
            min_p: 0.1,
            guidance: 'Sampler order: min_p before temperature; set `temperature_last: true` if your backend exposes it.',
            confidence: 'medium',
            sources: ['https://huggingface.co/anthracite-org/magnum-v1-72b/discussions/6'],
        },
    },
    {
        id: 'behemoth-123b-v1',
        displayName: 'Behemoth 123B v1',
        family: 'mistral-finetune',
        provider: 'infermatic',
        contextWindow: 32000,
        strength: 'r/LocalLLM darling — max-quality local RP.',
        matchPatterns: ['behemoth-123b-v1', 'thedrummer/behemoth-123b-v1'],
        systemPromptRole: 'system',
        promptOverrides: {
            role: _MISTRAL_INST_ROLE_TEXT,
        },
        notes: 'Mistral Large base — [INST] template wrap.',
        samplerHints: {
            temperature: 0.85,
            top_p: 1.0,
            min_p: 0.1,
            confidence: 'medium',
        },
    },
    {
        id: 'monstral-123b',
        displayName: 'Monstral 123B',
        family: 'mistral-finetune',
        provider: 'infermatic',
        contextWindow: 32000,
        strength: 'Behemoth alternative — chat-focused merge.',
        matchPatterns: ['monstral-123b', 'marsupialai/monstral-123b'],
        systemPromptRole: 'system',
        promptOverrides: {
            role: _MISTRAL_INST_ROLE_TEXT,
        },
        notes: 'Mistral Large derivative — same [INST] convention.',
        samplerHints: {
            temperature: 0.85,
            top_p: 1.0,
            min_p: 0.05,
            confidence: 'low',
        },
    },
    {
        id: 'midnight-miqu-70b-v1-5',
        displayName: 'Midnight Miqu 70B v1.5',
        family: 'llama-finetune',
        provider: 'local',
        contextWindow: 32000,
        strength: 'Long-loved RP standby. Strong prose + character consistency.',
        matchPatterns: ['midnight-miqu-70b-v1.5', 'sophosympatheia/midnight-miqu-70b-v1.5'],
        systemPromptRole: 'system',
        promptOverrides: {
            role: `You are a precise scene analysis engine. Output one JSON object matching the schema. Raw JSON only — no prose, no markdown, no preamble. Begin output with { immediately.`,
        },
        notes: 'Miqu base benefits from the explicit "begin with {" instruction — reduces leading prose.',
        samplerHints: {
            temperature: 1.0,
            top_p: 1.0,
            min_p: 0.12,
            repetition_penalty: 1.05,
            guidance: 'Backend-specific: smoothing 0.23, sampler order min_p first.',
            confidence: 'high',
            sources: ['https://huggingface.co/sophosympatheia/Midnight-Miqu-70B-v1.5'],
        },
    },
    {
        id: 'midnight-rose-70b',
        displayName: 'Midnight Rose 70B v2.0.3',
        family: 'llama-finetune',
        provider: 'local',
        contextWindow: 6000,
        strength: 'Uncensored RP/storytelling staple. Small context sweet spot.',
        matchPatterns: ['midnight-rose-70b-v2.0.3', 'sophosympatheia/midnight-rose-70b-v2.0.3'],
        systemPromptRole: 'system',
        promptOverrides: {
            role: _ALPACA_ROLE_TEXT,
        },
        notes: 'Alpaca-style template fits this finetune. KEEP context messages low (small native context).',
        samplerHints: {
            temperature: 1.0,
            top_p: 1.0,
            min_p: 0.35,
            repetition_penalty: 1.15,
            guidance: 'Backend-specific: smoothing 0.4, set `temperature_last: true` if exposed.',
            confidence: 'high',
            sources: ['https://huggingface.co/sophosympatheia/Midnight-Rose-70B-v1.0'],
        },
    },
    {
        id: 'dans-personality-v1-3',
        displayName: 'Dan\'s PersonalityEngine v1.3',
        family: 'mistral-finetune',
        provider: 'local',
        contextWindow: 32000,
        strength: 'Generalist with strong "personality" — RP + tool use.',
        matchPatterns: ['dans-personalityengine-v1.3.0-24b', 'pocketdoc/dans-personalityengine'],
        systemPromptRole: 'system',
        promptOverrides: {
            role: _CHATML_JAILBREAK_ROLE_TEXT,
        },
        notes: 'ChatML wrap; Dan\'s expects an explicit persona block in the system role.',
        samplerHints: {
            temperature: 0.7,
            top_p: 1.0,
            min_p: 0.05,
            confidence: 'low',
        },
    },
    {
        id: 'qwen-3-5-35b-claude-distill',
        displayName: 'Qwen 3.5-35B Claude-Distill (Abliterated)',
        family: 'qwen',
        provider: 'local',
        contextWindow: 128000,
        strength: 'Distilled-from-Opus reasoning; refusals abliterated.',
        matchPatterns: ['huihui-qwen3.5-35b-a3b-claude-4.6-opus-abliterated', 'qwen3.5-35b-claude'],
        systemPromptRole: 'system',
        promptOverrides: {},
        notes: 'Abliterated — no jailbreak needed. Sampler hints favor the Claude-distilled output style.',
        samplerHints: {
            temperature: 0.7,
            top_p: 0.8,
            top_k: 20,
            confidence: 'medium',
            sources: ['https://muxup.com/2025q2/recommended-llm-parameter-quick-reference'],
        },
    },
    {
        id: 'huihui-gemma-4-31b',
        displayName: 'Huihui Gemma 4 31B (Abliterated)',
        family: 'gemma-finetune',
        provider: 'local',
        contextWindow: 128000,
        strength: 'Strongest dense Gemma 4 abliteration. Multimodal.',
        matchPatterns: ['huihui-gemma-4-31b-abliterated', 'huihui-ai/huihui-gemma-4-31b'],
        systemPromptRole: 'system',
        promptOverrides: {
            role: _GEMMA_ROLE_TEXT,
        },
        notes: 'Gemma chat template wrap on the role slot.',
        samplerHints: {
            temperature: 1.0,
            top_p: 0.96,
            top_k: 64,
            confidence: 'high',
            sources: ['https://muxup.com/2025q2/recommended-llm-parameter-quick-reference'],
        },
    },
    {
        id: 'gemma-3-27b-abliterated',
        displayName: 'Gemma 3 27B (Abliterated)',
        family: 'gemma-finetune',
        provider: 'local',
        contextWindow: 128000,
        strength: 'Multimodal, low-refusal mid-tier daily driver.',
        matchPatterns: ['gemma-3-27b-abliterated', 'google/gemma-3-27b-abliterated'],
        systemPromptRole: 'system',
        promptOverrides: {
            role: _GEMMA_ROLE_TEXT,
        },
        notes: 'Gemma template + abliterated — no extra jailbreak needed.',
        samplerHints: {
            temperature: 1.0,
            top_p: 0.96,
            top_k: 64,
            confidence: 'high',
        },
    },
    {
        id: 'gemma-2-ataraxy-9b',
        displayName: 'Gemma 2 Ataraxy 9B',
        family: 'gemma-finetune',
        provider: 'local',
        contextWindow: 8000,
        strength: 'Creative writing/RP; high EQ-Bench. Tiny context.',
        matchPatterns: ['gemma-2-ataraxy-9b', 'lemonilia/gemma-2-ataraxy-9b'],
        systemPromptRole: 'system',
        promptOverrides: {
            role: _GEMMA_ROLE_TEXT,
        },
        notes: 'Small context — keep delta mode on, embed snapshots = 0.',
        samplerHints: {
            temperature: 1.0,
            top_p: 0.95,
            confidence: 'low',
        },
    },
    {
        id: 'mythomax-l2-13b',
        displayName: 'MythoMax L2 13B (legacy)',
        family: 'legacy',
        provider: 'local',
        contextWindow: 4000,
        strength: 'The legacy classic — still ~59k GGUF DLs/mo despite age.',
        matchPatterns: ['mythomax-l2-13b', 'gryphe/mythomax-l2-13b'],
        systemPromptRole: 'system',
        promptOverrides: {
            role: _ALPACA_ROLE_TEXT,
            criticalRules: `## CRITICAL RULES\n1. Output ONLY valid JSON. No prose, no markdown fences, no preamble, no postscript.\n2. Begin your response with { immediately.\n3. Every field MUST contain meaningful data — empty string "" or null is a critical error EXCEPT for charactersPresent which may be [] for solo scenes.\n4. If unsure, infer from context. A best-guess answer is better than empty.`,
        },
        notes: 'Tiny 4K context. Aggressively shortened critical rules. Alpaca template. Disable delta mode (model can\'t handle the extra instructions reliably).',
        samplerHints: {
            temperature: 0.72,
            top_p: 1.0,
            repetition_penalty: 1.10,
            confidence: 'medium',
            sources: ['https://lemmy.world/post/15285618'],
        },
    },
    {
        id: 'gemmasutra-mini-2b',
        displayName: 'Gemmasutra Mini 2B',
        family: 'gemma-finetune',
        provider: 'local',
        contextWindow: 8000,
        strength: 'Phone/CPU NSFW RP. Tiny but capable.',
        matchPatterns: ['gemmasutra-mini-2b-v1', 'thedrummer/gemmasutra-mini-2b-v1'],
        systemPromptRole: 'system',
        promptOverrides: {
            role: _GEMMA_ROLE_TEXT,
            criticalRules: `## CRITICAL RULES\n1. Output ONLY valid JSON. No prose. Begin with { immediately.\n2. Every field MUST have data; empty values are errors except charactersPresent which may be [] for solo scenes.\n3. If unsure, infer or carry forward.`,
        },
        notes: 'Very small — shortened rules and Gemma template wrap. Disable storyIdeas and questValidation slot to save tokens.',
        samplerHints: {
            temperature: 0.8,
            top_p: 0.95,
            confidence: 'low',
        },
    },
    {
        id: 'glm-4-6v-flash-abliterated',
        displayName: 'Huihui GLM-4.6V Flash (Abliterated)',
        family: 'glm',
        provider: 'local',
        contextWindow: 128000,
        strength: 'Vision-language RP for character images.',
        matchPatterns: ['huihui-glm-4.6v-flash-abliterated', 'glm-4.6v'],
        systemPromptRole: 'system',
        promptOverrides: {},
        notes: 'Vision-capable — feed character portraits via lorebook for richer descriptions. Sampler hints from GLM-4 Flash docs.',
        samplerHints: {
            temperature: 0.6,
            top_p: 0.95,
            top_k: 20,
            min_p: 0.05,
            repetition_penalty: 1.05,
            confidence: 'medium',
            sources: ['https://huggingface.co/zai-org/GLM-4.7-Flash/discussions/6'],
        },
    },
    {
        id: 'llama-3-3-70b-rp',
        displayName: 'Llama 3.3 70B RP merges (Steel/Sao10K family)',
        family: 'llama-finetune',
        provider: 'local',
        contextWindow: 128000,
        strength: 'Generic Llama 3.3 RP merges (Steelskull, Sao10K, DavidAU variants). Adjust per merge.',
        matchPatterns: ['l3.3-cu-mai-r1-70b', 'llama-3.3-70b', 'sao10k', 'steelskull'],
        systemPromptRole: 'system',
        promptOverrides: {
            role: _LLAMA3_CHAT_ROLE_TEXT,
        },
        notes: 'Llama 3 chat template wrap. Many L3.3 merges work without jailbreak; some need ChatML — try both.',
        samplerHints: {
            temperature: 0.86,
            top_p: 1.0,
            min_p: 0.025,
            confidence: 'medium',
            sources: ['https://huggingface.co/Sao10K/Llama-3.3-70B-Vulpecula-r1/discussions/4'],
        },
    },
    {
        id: 'command-a-2025',
        displayName: 'Command A / R+',
        family: 'command-r',
        provider: 'cohere-api',
        contextWindow: 256000,
        strength: 'Niche but loved for tool-use RP / ST extras.',
        matchPatterns: ['command-a-03-2025', 'command-r-plus-08-2024', 'cohere/command-a'],
        systemPromptRole: 'system',
        promptOverrides: {},
        notes: 'Cohere preamble support lives in the connection profile, not the prompt. Lower-temperature sampler hints tune for tool-use accuracy.',
        samplerHints: {
            temperature: 0.3,
            top_p: 0.75,
            confidence: 'medium',
        },
    },
    {
        id: 'grok-4',
        displayName: 'Grok 4',
        family: 'grok',
        provider: 'openrouter',
        contextWindow: 256000,
        strength: 'Rising "no-guardrails" proprietary pick on OpenRouter.',
        matchPatterns: ['grok-4', 'x-ai/grok-4'],
        systemPromptRole: 'system',
        promptOverrides: {},
        notes: 'Grok 4 reduces refusal language naturally. Sampler hints follow xAI\'s tune-one-not-both guidance.',
        samplerHints: {
            temperature: 0.7,
            top_p: 0.95,
            guidance: 'xAI: alter EITHER temperature OR top_p, not both at once.',
            confidence: 'medium',
            sources: ['https://docs.x.ai/developers/models/grok-4-0709'],
        },
    },

    // ─── Tier 3: v6.25.0 additions — frontier models + high-priority finetunes ───

    {
        id: 'glm-5',
        displayName: 'GLM 5',
        family: 'glm',
        provider: 'z-ai',
        contextWindow: 200000,
        strength: 'Z.AI flagship; long-context; bilingual EN/ZH.',
        matchPatterns: ['glm-5', 'zai-org/glm-5', 'z-ai/glm-5'],
        systemPromptRole: 'system',
        promptOverrides: {},
        notes: 'Tune EITHER temperature OR top_p — Z.AI explicitly warns against tuning both at once. Sampler hints below default to temperature.',
        samplerHints: {
            temperature: 1.0,
            top_p: 0.95,
            guidance: 'Z.AI: tune ONE of temperature/top_p, never both. For tracker JSON, drop temp to 0.7 and keep top_p 0.95.',
            confidence: 'high',
            sources: [
                'https://docs.vllm.ai/projects/recipes/en/latest/GLM/GLM5.html',
                'https://huggingface.co/zai-org/GLM-5',
            ],
        },
    },
    {
        id: 'glm-5-1',
        displayName: 'GLM 5.1',
        family: 'glm',
        provider: 'z-ai',
        contextWindow: 200000,
        strength: 'GLM 5 refresh; benchmark-validated 0.7/0.95 for structured tasks.',
        matchPatterns: ['glm-5.1', 'zai-org/glm-5.1', 'z-ai/glm-5.1'],
        systemPromptRole: 'system',
        promptOverrides: {},
        notes: 'GLM 5.1 benchmarks run at temp 0.7 / top_p 0.95 — those values translate well to structured tracker JSON.',
        samplerHints: {
            temperature: 0.7,
            top_p: 0.95,
            guidance: 'Z.AI: tune ONE of temperature/top_p, never both. Benchmark config (temp 0.7) is ideal for JSON adherence.',
            confidence: 'high',
            sources: [
                'https://docs.z.ai/guides/overview/migrate-to-glm-new',
                'https://huggingface.co/zai-org/GLM-5.1',
            ],
        },
    },
    {
        id: 'claude-opus-4-7',
        displayName: 'Claude Opus 4.7',
        family: 'claude',
        provider: 'anthropic-api',
        contextWindow: 200000,
        strength: 'Anthropic\'s headline 4.7 — effort-based control, no temp/top_p/top_k.',
        matchPatterns: ['claude-opus-4-7', 'anthropic/claude-opus-4-7', 'claude-4-7-opus'],
        systemPromptRole: 'user',
        promptOverrides: {
            role: `<task>Scene analysis. Output one JSON object matching the schema. Raw JSON only — no prose, no markdown fences, no commentary, no extended thinking shown to the user. Do not echo the schema. Begin output with the JSON object.</task>`,
        },
        notes: _CLAUDE_USER_ROLE_NOTE + ' Anthropic 4.7 rejects temperature/top_p/top_k — control quality via the `effort` parameter instead.',
        samplerHints: {
            guidance: 'Anthropic 4.7 IGNORES temperature, top_p, top_k (HTTP 400 if set). Use `effort: high` for narrative quality, `effort: medium` for the tracker call.',
            confidence: 'high',
            sources: ['https://platform.claude.com/docs/en/about-claude/models/whats-new-claude-4-7'],
        },
    },
    {
        id: 'claude-sonnet-4-7',
        displayName: 'Claude Sonnet 4.7',
        family: 'claude',
        provider: 'anthropic-api',
        contextWindow: 200000,
        strength: 'Sonnet 4.7 — same effort-based API as Opus 4.7, faster + cheaper.',
        matchPatterns: ['claude-sonnet-4-7', 'anthropic/claude-sonnet-4-7', 'claude-4-7-sonnet'],
        systemPromptRole: 'user',
        promptOverrides: {
            role: `<task>Scene analysis. Output one JSON object matching the schema. Raw JSON only — no prose, no markdown fences, no commentary, no extended thinking shown to the user. Begin output with the JSON object.</task>`,
        },
        notes: _CLAUDE_USER_ROLE_NOTE + ' Anthropic 4.7 rejects temperature/top_p/top_k — use `effort: medium` for tracker calls.',
        samplerHints: {
            guidance: 'Anthropic 4.7 IGNORES temperature, top_p, top_k (HTTP 400 if set). Use `effort: medium` for tracker; `effort: high` for narrative.',
            confidence: 'high',
            sources: ['https://platform.claude.com/docs/en/about-claude/models/whats-new-claude-4-7'],
        },
    },
    {
        id: 'anubis-pro-70b',
        displayName: 'Anubis Pro 70B',
        family: 'llama-finetune',
        provider: 'local',
        contextWindow: 128000,
        strength: 'Steelskull\'s flagship Llama 3.3 RP merge — premium prose on local.',
        matchPatterns: ['anubis-pro-70b', 'steelskull/anubis-pro-70b', 'l3.3-anubis'],
        systemPromptRole: 'system',
        promptOverrides: {
            role: _LLAMA3_CHAT_ROLE_TEXT,
        },
        notes: 'Llama 3 chat template wrap. Anubis lineage handles the rule list cleanly.',
        samplerHints: {
            temperature: 0.86,
            top_p: 1.0,
            min_p: 0.025,
            confidence: 'medium',
            sources: ['https://huggingface.co/Sao10K/Llama-3.3-70B-Vulpecula-r1/discussions/4'],
        },
    },
    {
        id: 'eva-llama-3-33-70b',
        displayName: 'EVA-Llama 3.33 70B',
        family: 'llama-finetune',
        provider: 'featherless',
        contextWindow: 128000,
        strength: 'EVA Unit-01 finetune — Featherless RP staple.',
        matchPatterns: ['eva-llama-3.33-70b', 'eva-unit-01/eva-llama-3.33-70b', 'eva-llama-3-33'],
        systemPromptRole: 'system',
        promptOverrides: {
            role: _LLAMA3_CHAT_ROLE_TEXT,
        },
        notes: 'Llama 3 chat template wrap. EVA expects a structured system block.',
        samplerHints: {
            temperature: 1.0,
            top_p: 1.0,
            min_p: 0.05,
            repetition_penalty: 1.05,
            confidence: 'medium',
            sources: ['https://featherless.ai/models/EVA-UNIT-01/EVA-LLaMA-3.33-70B-v0.0'],
        },
    },
    {
        id: 'cydonia-24b-v4',
        displayName: 'Cydonia 24B v4',
        family: 'mistral-finetune',
        provider: 'local',
        contextWindow: 32000,
        strength: 'Cydonia v2 refresh on a newer Mistral Small base. Tighter prose.',
        matchPatterns: ['cydonia-24b-v4', 'thedrummer/cydonia-24b-v4'],
        systemPromptRole: 'system',
        promptOverrides: {
            role: _MISTRAL_INST_ROLE_TEXT,
        },
        notes: 'Mistral [INST] template wrap. v4 base is slightly more JSON-compliant than v2 — may not need shortened rules.',
        samplerHints: {
            temperature: 0.85,
            top_p: 1.0,
            min_p: 0.04,
            confidence: 'medium',
            sources: ['https://huggingface.co/TheDrummer/Cydonia-24B-v2/discussions/4'],
        },
    },
    {
        id: 'magidonia-24b-v4-3',
        displayName: 'Magidonia 24B v4.3',
        family: 'mistral-finetune',
        provider: 'local',
        contextWindow: 32000,
        strength: 'Cydonia + Magnum hybrid — Drummer\'s flagship 24B RP merge.',
        matchPatterns: ['magidonia-24b-v4.3', 'thedrummer/magidonia-24b-v4.3', 'magidonia'],
        systemPromptRole: 'system',
        promptOverrides: {
            role: _CHATML_JAILBREAK_ROLE_TEXT,
        },
        notes: 'Magnum hybrid expects ChatML jailbreak prefix. Cydonia base provides clean structured output.',
        samplerHints: {
            temperature: 0.9,
            top_p: 1.0,
            min_p: 0.05,
            confidence: 'medium',
            sources: ['https://huggingface.co/TheDrummer/Magidonia-24B-v4.3'],
        },
    },
    {
        id: 'cydonia-r1-24b-v4-1',
        displayName: 'Cydonia-R1 24B v4.1',
        family: 'mistral-finetune',
        provider: 'local',
        contextWindow: 32000,
        strength: 'Cydonia reasoning variant — DeepSeek-R1-style thinking on Cydonia base.',
        matchPatterns: ['cydonia-r1-24b-v4.1', 'thedrummer/cydonia-r1-24b-v4.1', 'cydonia-r1'],
        systemPromptRole: 'system',
        promptOverrides: {
            role: `[INST] You are a precise scene analysis engine. Output ONE JSON object matching the schema. Raw JSON only — no prose, no markdown fences, no <think> blocks in the final output. If you must reason, do it before producing the JSON; the JSON itself must be the only thing in your response after thinking. [/INST]`,
        },
        notes: 'R1-style reasoning variant — explicitly instructs the model to keep <think> out of the final JSON.',
        samplerHints: {
            temperature: 0.7,
            top_p: 1.0,
            min_p: 0.04,
            confidence: 'low',
            sources: ['https://huggingface.co/TheDrummer/Cydonia-24B-v2/discussions/4'],
        },
    },
];

/**
 * Quick lookup by canonical preset id.
 */
export function findPresetById(id) {
    return BUILT_IN_PRESETS.find(p => p.id === id) || null;
}

/**
 * All families represented in the built-in set. Useful for the editor's
 * "filter presets by family" dropdown (planned for v6.21+).
 */
export function getPresetFamilies() {
    return Array.from(new Set(BUILT_IN_PRESETS.map(p => p.family))).sort();
}
