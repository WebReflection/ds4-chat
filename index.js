import el from 'https://esm.run/@webreflection/element';
import markdownit from 'https://esm.run/markdown-it';

import JSONStorage from './json-storage.js';
import DS4 from './ds4.js';

const { ceil } = Math;

const storage = new JSONStorage;

let ds4, scrolling = true, noThinking = true;

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
      text: message,
    });

    const waiting = el('div', {
      class: 'message assistant thinking',
    });

    const assistant = el('div', {
      class: 'message assistant',
    });

    let c = 0, t = '⠋⠙⠹⠸⠹⠴⠦⠧'.split(''), wasScrolling = scrolling;
    const adjustScrolling = () => {
      if (wasScrolling) messages.scrollTop = messages.scrollHeight;
    };

    messages.append(user, waiting, assistant);
    adjustScrolling();

    let noContent = true;

    for await (const { content, reasoning } of ds4.chat(message)) {
      wasScrolling = scrolling;
      if (reasoning) {
        assistant.innerHTML = `${t[c++ % t.length]} <sub><sup>Thinking ...</sup></sub>`;
        waiting.append(reasoning);
      }
      else {
        if (noContent) {
          noContent = false;
          assistant.textContent = '';
        }
        assistant.append(content);
      }
      adjustScrolling();
    }

    if (noContent) assistant.textContent = '';

    input.disabled = false;
    submit.disabled = false;
    input.focus();

    const md = markdownit();
    assistant.innerHTML = md.render(assistant.textContent);
    assistant.classList.add('markdown');
  },
});

input.value = storage.get('ds4') ?? ''; // http://192.168.178.91:8000
checkbox.checked = storage.get('noThinking') ?? false;
checkbox.dispatchEvent(new Event('change'));
