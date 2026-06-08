import Queue from 'https://esm.run/gen-q';

const { abs, round, sqrt } = Math;
const { parse, stringify } = JSON;
const decoder = new TextDecoder;

const chatOptions = {
  stream: true,
  think: true,
  temperature: 0.0,
};

const ds4Options = {
  model: 'deepseek-v4-flash',
  version: 'v1',
  system: 'You are a helpful assistant.',
  history: 64,
};

const data = (content, reasoning) => ({ content, reasoning });
const message = (role, content) => ({ role, content });

export default class DS4 {
  #history;
  #messages;
  #model;
  #url;

  constructor(
    url,
    {
      model = ds4Options.model,
      version = ds4Options.version,
      history = ds4Options.history,
      system = ds4Options.system,
    } = ds4Options,
  ) {
    this.#model = model;
    this.#url = new URL(`${url.replace(/\/+$/, '')}/${version}`);
    this.#history = abs((parseInt(history, 10) || 0) * 2) + 1;
    this.#messages = [message('system', system)];
  }

  async *chat(
    content,
    {
      stream = chatOptions.stream,
      temperature = chatOptions.temperature,
      think = chatOptions.think,
    } = chatOptions
  ) {
    this.#messages.push(message('user', content));

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
        temperature,
        think,
      }),
    });

    const reader = body.getReader();

    new ReadableStream({
      async start(controller) {
        (function next() {
          reader.read().then(({ done, value }) => {
            if (done) {
              controller.close();
              setTimeout(() => items.splice(0), 300);
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
        yield data(content, null);
      }
      else if (reasoning_content) {
        yield data(null, reasoning_content);
      }
    }

    if (this.#messages.push(message('assistant', answer.join(''))) > this.#history)
      this.#messages.splice(1, round(sqrt(this.#history)));
  }
}
