import * as vscode from 'vscode';
import ollama from 'ollama';

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

		panel.webview.html = getWebviewContent();

		panel.webview.onDidReceiveMessage(
			async (message: any) => {
				if (message.command === "chat") {
					const userPrompt = message.text;
					let responseText = '';

					try {

						panel.webview.postMessage({ command: 'thinking', isThinking: true });

						const streamResponse = await ollama.chat({
							model: 'deepseek-r1:1.5b',
							messages: [{ role: 'user', content: userPrompt }],
							stream: true,
						});

						for await (const part of streamResponse) {
							responseText += part.message.content;
						}

						panel.webview.postMessage({ command: 'receiveMessage', text: responseText });

						panel.webview.postMessage({ command: 'thinking', isThinking: false });

					} catch (err) {
						panel.webview.postMessage({ command: 'receiveMessage', text: `Error: ${String(err)}` });
					}
				}
			}
		);

		context.subscriptions.push(disposable);
	});
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
            #chat { 
                height: 80vh; 
                overflow-y: auto; 
                border: 1px solid #ccc; 
                padding: 10px; 
                background-color:rgb(26, 23, 23); 
                border-radius: 5px; 
            }
            #chat div { 
                margin-bottom: 10px; 
                padding: 5px; 
                border-radius: 5px; 
            }
            #chat div:nth-child(odd) { 
                background-color:rgb(26, 23, 23); 
            }
            #chat div:nth-child(even) { 
                background-color: rgb(37, 34, 34); 
            }
            #input { 
                display: flex; 
                margin-top: 10px; 
            }
            #input textarea { 
                flex: 1; 
                padding: 10px; 
                border: 1px solid #ccc; 
                border-radius: 5px; 
            }
            #input button { 
                padding: 10px; 
                margin-left: 10px; 
                background-color: #007acc; 
                color: white; 
                border: none; 
                border-radius: 5px; 
                cursor: pointer; 
            }
            #input button:hover { 
                background-color: #005f99; 
            }
            #thinking { 
                font-style: italic; 
                color: white; 
                display: none; 
            }
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
                
                // Style the sender and message text
                messageElement.innerHTML = \`
                    <strong>\${sender}:</strong> <span style="white-space: pre-wrap;">\${text}</span>
                \`;
                
                chat.appendChild(messageElement);
                chat.scrollTop = chat.scrollHeight; // Auto-scroll to the latest message
            }
        </script>
    </body>
    </html>
    `;
}

export function deactivate() { }