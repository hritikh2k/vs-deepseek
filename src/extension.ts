import * as vscode from 'vscode';
import ollama from 'ollama'; // Ensure 'ollama' is installed

export function activate(context: vscode.ExtensionContext) {
	console.log('DeepSeek-R1 extension is now active!');

	const disposable = vscode.commands.registerCommand('vs-deepseek.deepChat', () => {
		const panel = vscode.window.createWebviewPanel(
			'deepchat',
			'Deepseek Chat',
			vscode.ViewColumn.One,
			{
				enableScripts: true,
				retainContextWhenHidden: true,
			}
		);

		// Set the initial HTML content for the webview
		panel.webview.html = getWebviewContent();

		// Handle messages from the webview
		panel.webview.onDidReceiveMessage(
			async (message: any) => {
				if (message.command === "chat") {
					const userPrompt = message.text;
					let responseText = '';

					try {
						// Indicate that the bot is thinking
						panel.webview.postMessage({ command: 'thinking', isThinking: true });

						const streamResponse = await ollama.chat({
							model: 'deepseek-r1:1.5b',
							messages: [{ role: 'user', content: userPrompt }],
							stream: true,
						});

						for await (const part of streamResponse) {
							responseText += part.message.content;
						}

						// Send the full response once processing is complete
						panel.webview.postMessage({ command: 'receiveMessage', text: responseText });

						// Remove the "thinking" indicator
						panel.webview.postMessage({ command: 'thinking', isThinking: false });

					} catch (err) {
						panel.webview.postMessage({ command: 'receiveMessage', text: `Error: ${String(err)}` });
					}
				}
			}
		);
	});

	context.subscriptions.push(disposable);
}

function getWebviewContent(): string {
	return /*html*/ `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Deepseek Chat</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 10px; }
            #chat { height: 80vh; overflow-y: auto; border: 1px solid #ccc; padding: 10px; }
            #input { display: flex; margin-top: 10px; }
            #input textarea { flex: 1; padding: 10px; }
            #input button { padding: 10px; cursor: pointer; }
            #thinking { font-style: italic; color: gray; display: none; }
        </style>
    </head>
    <body>
        <div id="chat"></div>
        <div id="thinking">AI is thinking...</div>
        <div id="input">
            <textarea id="message" rows="3" placeholder="Type your message..."></textarea>
            <button id="send">Send</button>
        </div>
        <script>
            const vscode = acquireVsCodeApi();

            document.getElementById('send').addEventListener('click', () => {
                const message = document.getElementById('message').value.trim();
                if (message) {
                    appendMessage('You', message);
                    vscode.postMessage({ command: 'chat', text: message });
                    document.getElementById('message').value = '';
                }
            });

            window.addEventListener('message', (event) => {
                const message = event.data;
                
                if (message.command === 'receiveMessage') {
                    appendMessage('AI', message.text);
                }
                
                if (message.command === 'thinking') {
                    document.getElementById('thinking').style.display = message.isThinking ? 'block' : 'none';
                }
            });

            function appendMessage(sender, text) {
                const chat = document.getElementById('chat');
                const messageElement = document.createElement('div');
                messageElement.textContent = \`\${sender}: \${text}\`;
                chat.appendChild(messageElement);
                chat.scrollTop = chat.scrollHeight;
            }
        </script>
    </body>
    </html>
    `;
}

export function deactivate() { }
