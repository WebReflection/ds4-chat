# DS4 Chat

A simple and fun chat page that uses `/chat/completions` via [ds4](https://github.com/antirez/ds4).

To start the server in a way compatible with this project run the following command:

```sh
# generic command to allow browsers to chat remotely
./ds4-server --cors --host 0.0.0.0 --ctx 100000 --kv-disk-dir /tmp/ds4-kv --kv-disk-space-mb 8192
```

Reach your localhost and insert the remote *IP* of the **ds4-server** machine, example `http://192.168.100.20:8000`.

Connect and chat, feeling free to enable/disabled thinking (*reasoning*) mode via the toggle.

<img width="1331" height="1111" alt="ds4-chat" src="https://github.com/user-attachments/assets/2e27bd8b-b47a-4696-801c-7c9ec61a6fdc" />
