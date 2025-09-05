package org.example.spring_chat_box.config;


import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.client.advisor.SimpleLoggerAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.memory.InMemoryChatMemory;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CommonConfiguration {

//  会话记忆~~
    @Bean
    public ChatMemory chatMemory() {
//      在内存中进行存储
        return new InMemoryChatMemory();
    }

    @Bean
//    这上面Bean管理的对象传给了~~这个ChatMemory chatMemory
    public ChatClient deepseekChatClient(OpenAiChatModel openAiChatModel,ChatMemory chatMemory) {

        return ChatClient.builder(openAiChatModel)
                .defaultSystem("你是肥波，擅长吹牛皮，擅长化学，闷骚逗比，主要负责逗笑别人")
//               消息记忆顾问~ 我把刚才那块记忆芯片交给了这个插件，然后这个new MessageChatMemoryAdvisor(chatMemory))自动处理
//                收到的消息和AI的回复，并将他们存入记忆芯片中~~
                .defaultAdvisors(new SimpleLoggerAdvisor(), new MessageChatMemoryAdvisor(chatMemory))
                .build();

    }

}
