# SpringAI Web Demo: 智能聊天机器人项目

这是一个基于 Spring AI 和 Spring Boot 构建的Web聊天应用程序。项目前端采用HTML、CSS和jQuery，后端集成DeepSeek大模型API，实现了一个支持流式响应和多轮对话记忆的智能聊天机器人。

## 项目简介

本项目是一个功能完整的Web聊天应用。用户可以通过简洁的界面与AI进行交互，AI能够联系上下文进行多轮对话。项目后端使用了Spring AI框架，极大地简化了与大语言模型（LLM）的集成和开发过程。

## 技术栈

* **后端框架:** Spring Boot
* **AI 框架:** Spring AI
* **语言模型:** DeepSeek API
* **前端技术:** HTML, CSS, jQuery (JavaScript)
* **构建工具:** Maven
* **编程语言:** Java 17
* **辅助工具:** Lombok

## 项目结构

```text
spring_chat_box
├── src
│   ├── main
│   │   ├── java/org/example/spring_chat_box
│   │   │   ├── config
│   │   │   │   └── CommonConfiguration.java  // Spring AI 配置类
│   │   │   ├── controller
│   │   │   │   └── ChatController.java       // Web API 控制器
│   │   │   ├── model
│   │   │   │   ├── ChatInfo.java             // 会话信息模型
│   │   │   │   └── MessageVO.java            // 消息视图模型
│   │   │   ├── repository
│   │   │   │   ├── ChatHistoryRepository.java // 会话历史仓库接口
│   │   │   │   └── MemoryChatHistoryRepository.java // 基于内存的实现
│   │   │   └── SpringChatBoxApplication.java // Spring Boot 主应用
│   │   └── resources
│   │       ├── static                        // 存放前端HTML, CSS, JS文件
│   │       │   ├── index.html
│   │       │   ├── script.js
│   │       │   └── styles.css
│   │       └── application.yml               // 配置文件 (API Key等)
└── pom.xml                                   // Maven 配置文件
```
### 核心模块说明

#### 1. 后端核心 (`/controller`, `/config`, `/repository`)

* **`ChatController.java`**: 项目的Web API入口。
    * `/stream`: 核心接口，接收用户输入（prompt）和会话ID（chatId），通过`Flux<String>`以流式（SSE）方式将AI的回答实时返回给前端。
    * `/getChatIds`: 获取所有历史会话的列表。
    * `/getChatHistory`: 根据会话ID获取具体的聊天记录。
    * `/deleteChat`: 删除指定的会话历史和记忆。
* **`CommonConfiguration.java`**: Spring AI的配置中心。
    * 配置了`ChatClient`，并设置了全局的系统级`prompt`（System Prompt），为AI设定了一个默认角色（“你是肥波，擅长吹牛皮...")。
    * 配置了`InMemoryChatMemory`作为会话记忆的存储方案，使得AI能够记住上下文。
    * 通过`MessageChatMemoryAdvisor`顾问，自动将用户的提问和AI的回答存入会话记忆中。
* **`MemoryChatHistoryRepository.java`**: 一个基于内存的`LinkedHashMap`实现的会话历史记录仓库，用于管理会话列表的标题和ID。

#### 2. 前端界面 (`/static`)

* **`index.html`**: 项目的主页面，构建了聊天界面的基本结构，包括左侧的会话列表和右侧的聊天窗口。
* **`script.js`**: 前端的核心逻辑。
    * 通过jQuery实现DOM操作和事件绑定。
    * 使用`fetch` API调用后端的`/stream`接口，并以流式方式读取和展示AI的回答。
    * 实现了新建会话、加载/切换历史会话、删除会话等功能。
    * 支持解析和渲染AI回答中的LaTeX数学公式（通过MathJax库）。
* **`styles.css` & `chat-board.css`**: 定义了整个聊天界面的样式，实现了现代化的聊天应用外观。

### 如何配置和运行

1.  **配置API Key**:
    * 打开 `src/main/resources/application.yml` 文件。
    * 将 `spring.ai.openai.api-key` 的值替换为您自己的DeepSeek API密钥。
2.  **运行项目**:
    * 确保您的开发环境中已安装Java 17和Maven。
    * 在项目根目录（`spring_chat_box`）下，执行Maven命令 `mvn spring-boot:run` 或直接运行 `SpringChatBoxApplication.java` 类。
3.  **访问应用**:
    * 项目启动后，默认运行在 `16666` 端口。
    * 打开浏览器并访问 `http://localhost:16666` 即可开始使用。

