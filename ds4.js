import Queue from 'https://esm.run/gen-q';

const { parse, stringify } = JSON;
const { max } = Math;
const decoder = new TextDecoder;

const chatOptions = {
  stream: true,
};

const defaultOptions = {
  model: 'deepseek-v4-flash',
  version: 'v1',
  history: 16,
  system: 'You are a helpful assistant.',
};

export default class DS4 {
  #history;
  #messages;
  #model;
  #url;

  constructor(
    url,
    {
      model = defaultOptions.model,
      version = defaultOptions.version,
      history = defaultOptions.history,
      system = defaultOptions.system,
    } = defaultOptions,
  ) {
    this.#url = new URL(`${url}/${version}`);
    this.#model = model;
    this.#history = max(2, history) + 1;
    this.#messages = [{ role: 'system', content: system }];
  }

  async *chat(content, { stream = true } = chatOptions) {
    this.#messages.push({ role: 'user', content });

    const items = new Queue;

    const { body } = await fetch(`${this.#url}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: stringify({
        model: this.#model,
        messages: this.#messages,
        stream,
      }),
    });

    const reader = body.getReader();

    new ReadableStream({
      async start(controller) {
        (function next() {
          reader.read().then(({ done, value }) => {
            if (done) {
              items.splice(0);
              controller.close();
              return;
            }
            const text = decoder.decode(value);
            for (const chunk of text.split(/[\r\n]+/)) {
              let json = chunk.trim();
              if (json.startsWith('data:')) {
                json = json.slice(5).trimStart();
                if (json.startsWith('{') && json.endsWith('}'))
                  items.push(...parse(json).choices);
              }
            }
            next();
          });
        }());
      },
    });

    const answer = [];

    for await (const item of items) {
      const { finish_reason, delta } = item;

      if (finish_reason != null) break;

      const { content, reasoning_content } = delta;
      if (content) {
        answer.push(content);
        yield { content, reasoning: null };
      }
      else if (reasoning_content) {
        yield { content: null, reasoning: reasoning_content };
      }
    }

    if (this.#messages.push({ role: 'assistant', content: answer.join('') }) >= this.#history)
      this.#messages.splice(1, 2);
  }

}
