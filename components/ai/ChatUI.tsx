'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, User, RefreshCw, ThumbsUp, ThumbsDown, Copy, Check, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage } from '@/lib/ai-service';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

// Suggested questions to help users get started
const suggestedQuestions = [
  "How many products can I produce with current inventory?",
  "Which components are running low on stock?",
  "What are the quality control procedures?",
  "Show me defects reported in the last month",
  "Explain the assembly process for Model X",
];

export function ChatUI() {
  const [loading, setLoading] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Hi there! I\'m your Vembi Inventory AI assistant. How can I help you today?'
    }
  ]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<{ [key: number]: 'up' | 'down' | null }>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Reset copy button state after 2 seconds
  useEffect(() => {
    if (copiedIndex !== null) {
      const timer = setTimeout(() => {
        setCopiedIndex(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [copiedIndex]);

  // Handle message sending
  const handleSendMessage = async (customMessage?: string) => {
    const messageText = customMessage || inputValue.trim();
    if (!messageText || loading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: messageText
    };

    // Update local messages
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get AI response');
      }

      const data = await response.json();
      
      // Add AI response to messages
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.response || 'Sorry, I couldn\'t process your request at the moment.'
        }
      ]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to get a response', {
        description: error instanceof Error ? error.message : 'Please try again later'
      });
      
      // Add error message
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'I\'m having trouble connecting to the server. Please try again later.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Handle keypress (Enter to send, Shift+Enter for new line)
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Clear chat history
  const handleClearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: 'Chat cleared. How can I help you today?'
      }
    ]);
    setFeedbackGiven({});
    setCopiedIndex(null);
  };

  // Copy message content to clipboard
  const copyToClipboard = (content: string, index: number) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedIndex(index);
      toast.success('Copied to clipboard');
    });
  };

  // Handle feedback on responses
  const handleFeedback = (index: number, type: 'up' | 'down') => {
    setFeedbackGiven(prev => ({
      ...prev,
      [index]: type
    }));
    
    // In a production app, you would send this feedback to your API
    toast.success(`Feedback submitted: ${type === 'up' ? 'Helpful' : 'Not helpful'}`);
  };

  // Handle suggested question click
  const handleSuggestedQuestionClick = (question: string) => {
    setInputValue(question);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-[700px] bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-[#8B2131] to-[#6D1A27] text-white">
        <div className="flex items-center space-x-2">
          <Bot className="h-5 w-5" />
          <h2 className="font-semibold">Vembi Inventory AI Assistant</h2>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClearChat}
            className="text-white hover:bg-white/20"
            title="Clear chat"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Chat Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4 pb-2">
          {messages.map((message, i) => (
            <div
              key={i}
              className={`group flex ${
                message.role === 'assistant' ? 'justify-start' : 'justify-end'
              }`}
            >
              <div
                className={`max-w-[85%] rounded-lg p-4 shadow-sm ${
                  message.role === 'assistant'
                    ? 'bg-white border border-gray-200 text-gray-800'
                    : 'bg-gradient-to-r from-[#8B2131] to-[#6D1A27] text-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0">
                    {message.role === 'assistant' ? (
                      <div className="h-8 w-8 rounded-full bg-[#F5F1E4] flex items-center justify-center text-[#8B2131]">
                        <Bot className="h-5 w-5" />
                      </div>
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-white">
                        <User className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="w-full">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium">
                        {message.role === 'assistant' ? 'Vembi AI' : 'You'}
                      </span>
                      {message.role === 'assistant' && (
                        <div className="invisible group-hover:visible flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-gray-400 hover:text-gray-600"
                            onClick={() => copyToClipboard(message.content, i)}
                          >
                            {copiedIndex === i ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="chat-message prose-sm max-w-none">
                      {message.role === 'assistant' ? (
                        <ReactMarkdown
                          components={{
                            pre: ({ children }) => (
                              <pre className="bg-gray-100 p-2 rounded-md text-sm">{children}</pre>
                            ),
                            code: ({ children }) => (
                              <code className="bg-gray-100 px-1 py-0.5 rounded text-[#8B2131]">{children}</code>
                            )
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      ) : (
                        <p>{message.content}</p>
                      )}
                    </div>
                    {message.role === 'assistant' && i > 0 && (
                      <div className="mt-2 flex justify-end items-center space-x-2 invisible group-hover:visible">
                        <span className="text-xs text-gray-400">Was this helpful?</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-7 w-7 rounded-full ${
                            feedbackGiven[i] === 'up' 
                              ? 'bg-green-100 text-green-600' 
                              : 'text-gray-400 hover:text-gray-600'
                          }`}
                          onClick={() => handleFeedback(i, 'up')}
                          disabled={feedbackGiven[i] !== undefined}
                        >
                          <ThumbsUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-7 w-7 rounded-full ${
                            feedbackGiven[i] === 'down' 
                              ? 'bg-red-100 text-red-600' 
                              : 'text-gray-400 hover:text-gray-600'
                          }`}
                          onClick={() => handleFeedback(i, 'down')}
                          disabled={feedbackGiven[i] !== undefined}
                        >
                          <ThumbsDown className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {/* Loading indicator */}
          {loading && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-lg p-4 bg-white border border-gray-200 text-gray-800">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-[#F5F1E4] flex items-center justify-center text-[#8B2131]">
                      <Bot className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="flex items-center h-8">
                    <div className="flex space-x-1">
                      <div className="h-2 w-2 bg-[#8B2131] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="h-2 w-2 bg-[#8B2131] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      <div className="h-2 w-2 bg-[#8B2131] rounded-full animate-bounce" style={{ animationDelay: '600ms' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Suggested Questions (shown only if fewer than 3 messages) */}
      {messages.length < 3 && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center mb-2">
            <Lightbulb className="h-4 w-4 text-amber-500 mr-2" />
            <span className="text-sm font-medium text-gray-700">Try asking:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((question, index) => (
              <Badge 
                key={index} 
                variant="outline" 
                className="bg-white hover:bg-[#8B2131]/10 cursor-pointer text-[#8B2131] border-[#8B2131]/30 py-1.5"
                onClick={() => handleSuggestedQuestionClick(question)}
              >
                {question}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-end gap-2">
          <Textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your question here..."
            className="flex-1 min-h-[60px] max-h-[150px] resize-none border-gray-300 focus:border-[#8B2131] focus:ring-[#8B2131]/30"
            disabled={loading}
          />
          <Button 
            onClick={() => handleSendMessage()} 
            disabled={loading || !inputValue.trim()}
            className="bg-[#8B2131] hover:bg-[#6D1A27] h-[60px] px-4"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
        <div className="mt-2 text-xs text-gray-500 flex justify-between">
          <span>Press <kbd className="bg-gray-100 px-1 py-0.5 rounded">Shift</kbd> + <kbd className="bg-gray-100 px-1 py-0.5 rounded">Enter</kbd> for a new line</span>
          <span>{inputValue.length} characters</span>
        </div>
      </div>
    </div>
  );
} 