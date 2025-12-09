"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, X, Loader2, Sparkles, ChevronDown, User } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface Message {
    role: "user" | "assistant";
    content: string;
}

export function AIChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput("");
        setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
        setIsLoading(true);

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: userMessage,
                    history: messages,
                }),
            });

            if (!res.ok) throw new Error("Failed to fetch response");

            const data = await res.json();
            setMessages((prev) => [...prev, { role: "assistant", content: data.text }]);
        } catch (error) {
            console.error(error);
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {isOpen && (
                <Card className="mb-4 w-[400px] h-[600px] flex flex-col shadow-2xl border-primary/20 animate-in slide-in-from-bottom-5 fade-in duration-300 backdrop-blur-sm bg-background/95">
                    {/* Header */}
                    <div className="p-4 border-b flex items-center justify-between bg-primary/5 rounded-t-lg">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-primary/10 rounded-full">
                                <Bot className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-sm">Vembi AI Assistant</h3>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Sparkles className="h-3 w-3 text-slate-400" />
                                    Powered by Gemini
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full hover:bg-primary/10"
                            onClick={() => setIsOpen(false)}
                        >
                            <ChevronDown className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Messages */}
                    <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                        <div className="space-y-4">
                            {messages.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground space-y-4 mt-10">
                                    <div className="p-4 bg-primary/5 rounded-full">
                                        <Bot className="h-8 w-8 text-primary/50" />
                                    </div>
                                    <div>
                                        <p className="font-medium">How can I help you today?</p>
                                        <p className="text-xs mt-1">
                                            Ask about inventory, assemblies, returns, or vendor performance.
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2 w-full text-xs">
                                        <Button variant="outline" size="sm" className="justify-start" onClick={() => setInput("Check for low stock items")}>
                                            "Check for low stock items"
                                        </Button>
                                        <Button variant="outline" size="sm" className="justify-start" onClick={() => setInput("Show me return statistics")}>
                                            "Show me return statistics"
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {messages.map((msg, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        "flex gap-3 max-w-[85%]",
                                        msg.role === "user" ? "ml-auto flex-row-reverse" : ""
                                    )}
                                >
                                    <div className={cn(
                                        "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                                        msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                                    )}>
                                        {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                                    </div>
                                    <div
                                        className={cn(
                                            "p-3 rounded-2xl text-sm shadow-sm",
                                            msg.role === "user"
                                                ? "bg-primary text-primary-foreground rounded-tr-none"
                                                : "bg-muted text-foreground rounded-tl-none"
                                        )}
                                    >
                                        <div className="prose prose-sm dark:prose-invert max-w-none">
                                            <ReactMarkdown>
                                                {msg.content}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {isLoading && (
                                <div className="flex gap-3 max-w-[85%]">
                                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                                        <Bot className="h-4 w-4" />
                                    </div>
                                    <div className="bg-muted p-3 rounded-2xl rounded-tl-none flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span className="text-xs text-muted-foreground">Thinking...</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    {/* Input */}
                    <div className="p-4 border-t bg-background">
                        <form onSubmit={handleSubmit} className="flex gap-2">
                            <Input
                                placeholder="Ask anything..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                className="flex-1"
                                disabled={isLoading}
                            />
                            <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                                <Send className="h-4 w-4" />
                            </Button>
                        </form>
                    </div>
                </Card>
            )}

            <Button
                size="lg"
                className={cn(
                    "h-14 w-14 rounded-full shadow-lg transition-all duration-300 hover:scale-105",
                    isOpen ? "rotate-90 opacity-0 pointer-events-none absolute" : "rotate-0 opacity-100"
                )}
                onClick={() => setIsOpen(true)}
            >
                <Bot className="h-6 w-6" />
            </Button>
        </div>
    );
}
