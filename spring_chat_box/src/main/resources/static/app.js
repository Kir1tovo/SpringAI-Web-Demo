const { createApp, nextTick } = Vue

createApp({
    data() {
        return {
            userInput: '',
            messages: [],
            chatHistory: [],
            currentChatId: null,
            isLoading: false,
            replyingSessionIds: [],
            deleteMenuVisible: false,
            deleteMenuStyle: {},
            deleteChatId: null,
            baseUrl: '',
        }
    },
    methods: {
        generateChatId() {
            return 'chat-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
        },
        async loadChatHistory() {
            try {
                const response = await fetch(this.baseUrl + '/chat/getChatIds')
                if (!response.ok) throw new Error('获取历史会话失败')
                const chatIds = await response.json()
                this.chatHistory = chatIds.reverse()
            } catch (error) {
                console.error('加载历史会话失败:', error)
            }
        },
        async loadChatMessages(chatId) {
            try {
                const response = await fetch(this.baseUrl + `/chat/getChatHistory?chatId=${chatId}`)
                if (!response.ok) throw new Error('获取会话内容失败')
                const chatData = await response.json()
                this.messages = []
                chatData.forEach(item => {
                    if (item.role === 'user') {
                        this.messages.push({ isUser: true, content: item.content })
                    } else if (item.role === 'assistant') {
                        const parsed = this.parseResponse(item.content)
                        this.messages.push({
                            isUser: false,
                            thinking: parsed.thinking,
                            response: parsed.response,
                            thinkingExpanded: false,
                        })
                    }
                })
                await nextTick()
                this.scrollToBottom()
                this.typesetMathJax()
            } catch (error) {
                console.error('加载会话内容失败:', error)
                this.messages = []
                this.messages.push({ isUser: false, response: '加载历史会话内容失败，请重试', thinking: '', thinkingExpanded: false })
                await nextTick()
                this.typesetMathJax()
            }
        },
        addChatToHistory(chatItem, prepend = true) {
            const existing = this.chatHistory.find(c => c.chatId === chatItem.chatId)
            if (!existing) {
                if (prepend) {
                    this.chatHistory.unshift(chatItem)
                } else {
                    this.chatHistory.push(chatItem)
                }
            }
        },
        updateActiveChat(chatId) {
            this.currentChatId = chatId
        },
        switchChat(chatId) {
            if (this.replyingSessionIds.includes(this.currentChatId)) {
                const idx = this.replyingSessionIds.indexOf(this.currentChatId)
                if (idx !== -1) this.replyingSessionIds.splice(idx, 1)
            }
            this.currentChatId = chatId
            this.loadChatMessages(chatId)
            this.userInput = ''
        },
        createNewChat() {
            if (this.replyingSessionIds.includes(this.currentChatId)) {
                const idx = this.replyingSessionIds.indexOf(this.currentChatId)
                if (idx !== -1) this.replyingSessionIds.splice(idx, 1)
            }
            this.currentChatId = this.generateChatId()
            this.addChatToHistory({ chatId: this.currentChatId, title: this.currentChatId }, true)
            this.messages = []
            this.userInput = ''
            this.$nextTick(() => {
                this.$refs.userInputRef?.focus()
                this.adjustTextareaHeight()
            })
        },
        async handleSend() {
            const message = this.userInput.trim()
            if (!message || this.isLoading) return

            this.isLoading = true
            this.messages.push({ isUser: true, content: message })
            await nextTick()
            this.scrollToBottom()
            this.typesetMathJax()

            if (!this.currentChatId) {
                this.currentChatId = this.generateChatId()
                this.addChatToHistory({ chatId: this.currentChatId, title: message }, true)
            } else {
                const chat = this.chatHistory.find(c => c.chatId === this.currentChatId)
                if (chat) chat.title = message
            }

            this.replyingSessionIds.push(this.currentChatId)
            let fullResponse = ''
            let botMsgPushed = false

            try {
                const response = await fetch(
                    this.baseUrl + `/chat/stream?prompt=${encodeURIComponent(message)}&chatId=${this.currentChatId}`,
                    { method: 'GET', headers: { 'Accept': 'text/html' } }
                )
                const reader = response.body.getReader()
                const decoder = new TextDecoder()

                while (true) {
                    if (!this.replyingSessionIds.includes(this.currentChatId)) {
                        reader.cancel()
                        break
                    }
                    const { done, value } = await reader.read()
                    if (done) {
                        const idx = this.replyingSessionIds.indexOf(this.currentChatId)
                        if (idx !== -1) this.replyingSessionIds.splice(idx, 1)
                        break
                    }
                    const text = decoder.decode(value)
                    fullResponse += text
                    const parsed = this.parseResponse(fullResponse)

                    if (!botMsgPushed && (parsed.thinking || parsed.response)) {
                        this.messages.push({
                            isUser: false,
                            thinking: parsed.thinking,
                            response: parsed.response,
                            thinkingExpanded: false,
                        })
                        botMsgPushed = true
                    } else if (botMsgPushed) {
                        const lastMsg = this.messages[this.messages.length - 1]
                        if (lastMsg && !lastMsg.isUser) {
                            lastMsg.thinking = parsed.thinking
                            lastMsg.response = parsed.response
                            this.messages = [...this.messages]
                        }
                    }
                    await nextTick()
                    this.scrollToBottom()
                    this.typesetMathJax()
                }
            } catch (error) {
                console.error('Error:', error)
                const lastMsg = this.messages[this.messages.length - 1]
                if (botMsgPushed && lastMsg && !lastMsg.isUser && !lastMsg.response) {
                    lastMsg.response = '抱歉，发生错误，请稍后重试。'
                    this.messages = [...this.messages]
                    await nextTick()
                    this.typesetMathJax()
                } else if (!botMsgPushed) {
                    this.messages.push({
                        isUser: false,
                        thinking: '',
                        response: '抱歉，发生错误，请稍后重试。',
                        thinkingExpanded: false,
                    })
                    await nextTick()
                    this.typesetMathJax()
                }
            } finally {
                this.isLoading = false
                this.userInput = ''
                await nextTick()
                this.adjustTextareaHeight()
                if (this.replyingSessionIds.includes(this.currentChatId)) {
                    const idx = this.replyingSessionIds.indexOf(this.currentChatId)
                    if (idx !== -1) this.replyingSessionIds.splice(idx, 1)
                }
            }
        },
        parseResponse(text) {
            const thinkMatch = text.match(/<think>([\s\S]*?)<\/think>/)
            let thinking = ''
            let response = text
            if (thinkMatch) {
                thinking = thinkMatch[1].trim()
                response = text.replace(/<think>[\s\S]*?<\/think>/, '').trim()
            }
            return { thinking, response }
        },
        showDeleteMenu(event, chatId) {
            const rect = event.target.getBoundingClientRect()
            this.deleteMenuStyle = {
                left: (rect.left - 120) + 'px',
                top: (rect.top + 20) + 'px',
                display: 'block',
            }
            this.deleteChatId = chatId
            this.deleteMenuVisible = true
        },
        hideDeleteMenu() {
            this.deleteMenuVisible = false
            this.deleteChatId = null
        },
        async confirmDelete() {
            if (!this.deleteChatId) return
            try {
                const response = await fetch(this.baseUrl + `/chat/deleteChat?chatId=${this.deleteChatId}`)
                if (!response.ok) throw new Error('删除会话失败')
                this.chatHistory = this.chatHistory.filter(c => c.chatId !== this.deleteChatId)
                if (this.currentChatId === this.deleteChatId) {
                    this.currentChatId = null
                    this.messages = []
                }
            } catch (error) {
                console.error('删除会话失败:', error)
            }
            this.deleteMenuVisible = false
            this.deleteChatId = null
        },
        handleKeydown(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                this.handleSend()
            }
        },
        adjustTextareaHeight() {
            const el = this.$refs.userInputRef
            if (el) {
                el.style.height = 'auto'
                el.style.height = el.scrollHeight + 'px'
            }
        },
        scrollToBottom() {
            const container = this.$refs.chatMessages
            if (container) {
                container.scrollTop = container.scrollHeight
            }
        },
        typesetMathJax() {
            if (window.MathJax && MathJax.typesetPromise) {
                MathJax.typesetPromise()
            }
        },
        updateContentWidth() {
            const botMsg = this.$el?.querySelector('.bot-message')
            if (botMsg) {
                const width = botMsg.offsetWidth - 57
                document.body.style.setProperty('--contentWidth', width + 'px')
            }
        },
    },
    mounted() {
        this.loadChatHistory()
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault()
                this.createNewChat()
            }
        })
        window.addEventListener('resize', () => {
            this.updateContentWidth()
        })
    },
}).mount('#app')
