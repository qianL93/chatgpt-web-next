import http from "@/service/http";
import { ChatStore } from "@/store/Chat";
import { useRouter } from "next/router";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

const useChatProgress = (responding: boolean, setResponding: (e: boolean) => void) => {
    const router = useRouter();
    const { chat, updateChat } = useContext(ChatStore);
    const controller = useRef<AbortController>();
    const uuid = +(router.query.id || 0);
    const conversationList = useMemo(() => {
        return chat.find((item) => item.uuid === uuid)?.data || [];
    }, [chat, uuid]);

    const requestImp = async (ii: number, onMessageUpdate?: () => void) => {
        const index = ii || conversationList.length - 1;
        const currentChat = conversationList[index] || {};
        const message = currentChat.requestOptions?.prompt ?? "";
        const options = currentChat.requestOptions?.options ?? {};

        if (currentChat.text && currentChat.text !== "") {
            updateChat(uuid, index, {
                ...currentChat,
                dateTime: new Date().toLocaleString(),
                text: "",
                loading: true,
                error: false,
            });
        }

        setResponding(true);
        try {
            controller.current = new AbortController();
            const { signal } = controller.current;
            await http.fetchChatAPIProgress(
                {
                    prompt: message,
                    options,
                },
                {
                    signal,
                    onDownloadProgress: (
                        progressEvent: ProgressEvent<XMLHttpRequestEventTarget>
                    ) => {
                        const xhr = progressEvent.target;
                        const { responseText } = xhr as XMLHttpRequest;
                        // Always process the final line
                        const lastIndex = responseText.lastIndexOf("\n");
                        let chunk = responseText;
                        if (lastIndex !== -1) chunk = responseText.substring(lastIndex);
                        try {
                            const data = JSON.parse(chunk);
                            updateChat(uuid, index, {
                                dateTime: new Date().toLocaleString(),
                                text: data.text ?? "",
                                inversion: false,
                                error: false,
                                loading: false,
                                conversationOptions: {
                                    conversationId: data.conversationId,
                                    parentMessageId: data.id,
                                },
                                requestOptions: { prompt: message, options: { ...options } },
                            });
                            onMessageUpdate?.();
                        } catch (error) {
                            console.error(error);
                        }
                    },
                }
            );
        } catch (error: any) {
            if (!error) {
                return;
            }

            const errorMessage = error?.message ?? "好像出错误了，请稍后再试";
            if (currentChat?.text && currentChat.text !== "") {
                updateChat(uuid, index, {
                    ...currentChat,
                    text: `${currentChat.text}\n[${errorMessage}]`,
                    error: false,
                    loading: false,
                });
                onMessageUpdate?.();
                return;
            }

            updateChat(uuid, index, {
                dateTime: new Date().toLocaleString(),
                text: errorMessage,
                inversion: false,
                error: true,
                loading: false,
                conversationOptions: null,
                requestOptions: { prompt: message, options: { ...options } },
            });
            onMessageUpdate?.();
        } finally {
            setResponding(false);
        }
    };

    const requestRef = useRef(requestImp);
    requestRef.current = requestImp;

    const request = (index: number, onMessageUpdate?: () => void) => requestRef.current(index, onMessageUpdate);

    useEffect(() => {
        if (!responding && controller.current) {
            controller.current.abort();
        }
    }, [responding]);

    useEffect(() => {
        if (controller.current) {
            controller.current.abort();
        }
    }, [uuid]);

    return { request };
};

export default useChatProgress;
