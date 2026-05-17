import JSONStorage from 'https://esm.run/@webreflection/utils/json-storage';
import el from 'https://esm.run/@webreflection/element';
import markdownit from 'https://esm.run/markdown-it';

import DS4 from './ds4.js';

const { ceil } = Math;

let ds4, scrolling = true, noThinking = true;

const storage = new JSONStorage;

const md = markdownit({
  linkify: true,
});

const messages = el('< main .messages', {
  ['@scroll']() {
    const { scrollTop, scrollHeight, offsetHeight } = messages;
    scrolling = ceil(scrollTop) >= ceil(scrollHeight - offsetHeight);
  }
});

const input = el('< .input [type="text"]', {
  ['@keypress'](event) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      submit.click();
    }
  },
});

const checkbox = el('< [type="checkbox"]', {
  ['@change'](event) {
    const { checked } = event.currentTarget;
    noThinking = !checked;
    messages.classList.toggle('hide-thinking', noThinking);
    storage.set('noThinking', checked);
  },
});

const submit = el('< .input [type="submit"]', {
  ['@click']: async function (event) {
    event.preventDefault();
    const message = input.value.trim();
    if (!message) return;

    if (!ds4) {
      if (await fetch(message, { method: 'OPTIONS' }).then(r => r.ok)) {
        ds4 = new DS4(message);

        input.value = '';
        input.placeholder = 'Ask me anything...';
        submit.value = 'Send';

        messages.append(el('div', {
          class: 'message assistant',
          text: 'Welcome back! 👋 How can I help you today?',
        }));

        storage.set('ds4', message);
      }
      return;
    }

    input.value = '';
    input.disabled = true;
    submit.disabled = true;

    const user = el('div', {
      class: 'message user',
      html: md.render(message),
    });

    const waiting = el('div', {
      class: 'message assistant thinking',
    });

    const assistant = el('div', {
      class: 'message assistant',
    });

    let wasScrolling = scrolling;
    const adjustScrolling = () => {
      if (wasScrolling) messages.scrollTop = messages.scrollHeight;
    };

    messages.append(user, waiting, assistant);
    adjustScrolling();

    let noContent = true, notReasoning = true;

    for await (const { content, reasoning } of ds4.chat(message, { think: !noThinking })) {
      wasScrolling = scrolling;
      if (reasoning) {
        notReasoning = false;
        assistant.textContent = '🤔';
        waiting.append(reasoning);
      }
      else {
        if (noContent) {
          noContent = false;
          assistant.textContent = '';
          if (notReasoning)
            waiting.textContent = '⛔';
        }
        assistant.append(content);
      }
      adjustScrolling();
    }

    if (noContent) assistant.textContent = '';

    input.disabled = false;
    submit.disabled = false;
    input.focus();

    assistant.innerHTML = md.render(assistant.textContent);
    assistant.classList.add('markdown');
  },
});

input.value = storage.get('ds4') ?? ''; // http://192.168.178.91:8000
checkbox.checked = storage.get('noThinking') ?? false;
checkbox.dispatchEvent(new Event('change'));
