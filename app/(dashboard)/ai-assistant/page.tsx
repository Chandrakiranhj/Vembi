'use client';

import { useState } from 'react';
import { BrainCircuit, MessagesSquare, FileText, Sparkles, Database, Lightbulb } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChatUI } from '@/components/ai/ChatUI';
import { DocumentsManager } from '@/components/ai/DocumentsManager';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function AIAssistantPage() {
  const [activeTab, setActiveTab] = useState('chat');

  const capabilityCards = [
    {
      title: "Inventory Insights",
      icon: <Database className="h-5 w-5 text-[#8B2131]" />,
      description: "Get real-time information about component stock levels, production capacity, and low-stock alerts.",
      examples: [
        "How many units of Product X can I produce with current inventory?",
        "Which components are running low on stock?",
        "Show me the inventory status of component ABC"
      ]
    },
    {
      title: "Production Analysis",
      icon: <BrainCircuit className="h-5 w-5 text-[#8B2131]" />,
      description: "Analyze assembly data, identify bottlenecks, and get insights about production efficiency.",
      examples: [
        "What is our current production capacity?",
        "Show me defects reported in the last month",
        "Which components are limiting our production?"
      ]
    },
    {
      title: "Documentation",
      icon: <FileText className="h-5 w-5 text-[#8B2131]" />,
      description: "Search through company documentation, procedures, and guides.",
      examples: [
        "What is the quality control procedure?",
        "How do I assemble Product Y?",
        "Show me the latest returns policy"
      ]
    }
  ];

  return (
    <div className="container mx-auto">
      <div className="mb-8 flex flex-col md:flex-row gap-6 md:items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-6 w-6 text-amber-500" />
            <h1 className="text-3xl font-bold text-[#8B2131]">AI Assistant</h1>
          </div>
          <p className="text-gray-500">
            Your intelligent assistant for inventory management, production analysis, and knowledge retrieval.
          </p>
        </div>
        <div className="flex space-x-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 w-full max-w-md">
              <TabsTrigger value="chat" className="flex items-center">
                <MessagesSquare className="h-4 w-4 mr-2" />
                Chat Assistant
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Documents
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main area - Chat or Documents */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'chat' ? (
            <ChatUI />
          ) : (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl">Knowledge Documents</CardTitle>
                <CardDescription>
                  Add and manage documents that the AI can use to provide better answers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DocumentsManager />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Capabilities */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-xl">
                <Lightbulb className="h-5 w-5 mr-2 text-amber-500" />
                AI Capabilities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {capabilityCards.map((card, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center text-left">
                        <div className="mr-3 p-2 rounded-md bg-gray-100">{card.icon}</div>
                        <div>
                          <h3 className="font-medium">{card.title}</h3>
                          <p className="text-xs text-gray-500 mt-0.5">{card.description}</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="p-3 bg-gray-50 rounded-md mt-2 mb-2">
                        <h4 className="text-sm font-medium mb-2">Example Questions:</h4>
                        <ul className="space-y-2">
                          {card.examples.map((example, i) => (
                            <li key={i} className="flex items-start">
                              <span className="mr-2 text-[#8B2131]">•</span>
                              <span className="text-sm text-gray-700">{example}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          {activeTab === 'chat' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-xl">Tips for Best Results</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <span className="mr-2 text-[#8B2131] font-bold">1.</span>
                    <span className="text-sm text-gray-700">Be specific in your questions</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-[#8B2131] font-bold">2.</span>
                    <span className="text-sm text-gray-700">Mention specific product or component names</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-[#8B2131] font-bold">3.</span>
                    <span className="text-sm text-gray-700">For detailed information, break down complex questions</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-[#8B2131] font-bold">4.</span>
                    <span className="text-sm text-gray-700">Add relevant documentation in the Documents tab</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 