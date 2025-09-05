package org.example.spring_chat_box.controller;
import org.example.spring_chat_box.model.ChatInfo;
import org.example.spring_chat_box.model.MessageVO;
import org.example.spring_chat_box.repository.ChatHistoryRepository;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.AbstractChatMemoryAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.messages.Message;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.stream.Collectors;

@RequestMapping("/chat")
@RestController
public class ChatController {
    private  final ChatClient chatClient;

    @Autowired
    private ChatMemory chatMemory;


    @Autowired
    private ChatHistoryRepository  chatHistoryRepository;

    public ChatController(ChatClient deepseekChatClient) {
        this.chatClient = deepseekChatClient;
    }

    @RequestMapping(value = "/stream",produces = "text/html;charset=utf-8")
    public Flux<String> stream(String prompt,String chatId){


//      保存询问的历史信息
        chatHistoryRepository.save(chatId,prompt);

        return chatClient.prompt()
                .user(prompt)
//              这里进行会话的存储！！
//              这次对话的档案编号是{chatId} 把这次的对话记录到这个档案里
//              在提前前，它会把这个档案里的历史聊天记录都翻出来，连同用户的新问题一桶发给AI模型，这样AI就可以联系上下文
//              进行回答
//              .advisors(spec->spec.param(AbstractChatMemoryAdvisor.CHAT_MEMORY_CONVERSATION_ID_KEY,chatId))
                .advisors(spec->spec.param(AbstractChatMemoryAdvisor.CHAT_MEMORY_CONVERSATION_ID_KEY,chatId))
                .stream()
                .content();
    }

    /**
     * 获取会话列表
     * @return
     */

    @RequestMapping("/getChatIds")
    public List<ChatInfo> getChatIds(){
        return chatHistoryRepository.getChats();
    }

    /**
     * 获取会话记录
     * @param chatId
     * @return
     */

    @RequestMapping("/getChatHistory")
    public List<MessageVO> getChatHistory(String chatId){

        List<Message> messages = chatMemory.get(chatId, 20);
        return messages.stream().map(MessageVO::new).collect(Collectors.toList());
    }

    /**
     * 删除会话
     * @param chatId
     * @return
     */
    @RequestMapping("/deleteChat")
    public Boolean deleteChat(String chatId){
        try {
            chatHistoryRepository.clearByChatId(chatId);
            chatMemory.clear(chatId);
        }catch (Exception e){
            return false;
        }
        return true;
    }


}
