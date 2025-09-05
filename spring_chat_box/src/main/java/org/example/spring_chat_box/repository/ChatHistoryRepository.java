package org.example.spring_chat_box.repository;

import org.example.spring_chat_box.model.ChatInfo;
import org.springframework.stereotype.Repository;

import java.util.List;


@Repository
public interface ChatHistoryRepository  {


    void save(String chatId, String title);

    void clearByChatId(String chatId);

    List<ChatInfo> getChats();

}
