"use client";

import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRightIcon, MessageSquareIcon, PhoneIcon, MapPinIcon } from 'lucide-react';

export default function Contact() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Form handling form submission
    console.log('Form submitted');
  };

  return (
    <section className="py-16 bg-white dark:bg-gray-900">
      <div className="max-w-screen-xl mx-auto px-4 md:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Get in touch with us</h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Have questions about our services? Want to learn more about how we can help you achieve financial freedom? Reach out to us.
          </p>
        </motion.div>

        {/* Main contact section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative h-[400px] lg:h-[500px] rounded-xl overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/30 to-transparent z-10"></div>
            <Image
              src="https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&auto=format&fit=crop&w=774&q=80"
              alt="Customer support"
              fill
              className="object-cover"
            />
            
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent z-20">
              <h3 className="text-white text-xl font-medium mb-2">Need assistance?</h3>
              <p className="text-white/80">Our team is here to help you with any questions.</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="border-gray-100 dark:border-gray-700 bg-white/70 dark:bg-gray-800/70 backdrop-blur-md shadow-sm">
              <CardHeader>
                <CardTitle className="text-2xl">Contact Us</CardTitle>
                <CardDescription>Fill out the form below and we will get back to you soon</CardDescription>
              </CardHeader>
              
              <Tabs defaultValue="message">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="message">Message</TabsTrigger>
                  <TabsTrigger value="call">Call</TabsTrigger>
                  <TabsTrigger value="visit">Visit</TabsTrigger>
                </TabsList>
                
                <TabsContent value="message">
                  <CardContent className="space-y-4 pt-4">
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name</Label>
                          <Input id="firstName" placeholder="John" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input id="lastName" placeholder="Doe" required />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" placeholder="john.doe@example.com" required />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Input id="subject" placeholder="How can we help you?" required />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="message">Your Message</Label>
                        <Textarea 
                          id="message" 
                          placeholder="Tell us how we can help you..." 
                          className="min-h-[120px]" 
                          required 
                        />
                      </div>
                      
                      <Button type="submit" className="w-full">
                        Send Message
                        <ArrowRightIcon className="ml-2 h-4 w-4" />
                      </Button>
                    </form>
                  </CardContent>
                </TabsContent>
                
                <TabsContent value="call">
                  <CardContent className="pt-4">
                    <div className="bg-primary/5 p-4 rounded-lg mb-4">
                      <div className="flex items-start space-x-4">
                        <div className="bg-primary/10 p-2 rounded-full">
                          <PhoneIcon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h4 className="text-base font-medium mb-1">Call our customer support</h4>
                          <p className="text-gray-600 dark:text-gray-300 mb-2">Our team is available Mon-Fri, 9am-5pm</p>
                          <p className="text-lg font-medium text-primary">+234 (0) 7067013670</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                      <div className="flex items-start space-x-4">
                        <div className="bg-gray-200 dark:bg-gray-700 p-2 rounded-full">
                          <MessageSquareIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                        </div>
                        <div>
                          <h4 className="text-base font-medium mb-1">Chat with us</h4>
                          <p className="text-gray-600 dark:text-gray-300 mb-3">Start a live chat with our support team</p>
                          <Button variant="outline" size="sm">
                            Start Chat
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </TabsContent>
                
                <TabsContent value="visit">
                  <CardContent className="pt-4">
                    <div className="bg-primary/5 p-4 rounded-lg mb-4">
                      <div className="flex items-start space-x-4">
                        <div className="bg-primary/10 p-2 rounded-full">
                          <MapPinIcon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h4 className="text-base font-medium mb-1">Visit our office</h4>
                          <p className="text-gray-600 dark:text-gray-300 mb-2">123 Finance Street, Suite 100</p>
                          <p className="text-gray-600 dark:text-gray-300">New York, NY 10001</p>
                          <div className="mt-3">
                            <Button variant="outline" size="sm">
                              Get Directions
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="rounded-lg overflow-hidden h-[150px] relative">
                      {/* This would ideally be a map component */}
                      <div className="bg-gray-200 dark:bg-gray-700 w-full h-full flex items-center justify-center">
                        <span className="text-gray-500 dark:text-gray-400">Map location</span>
                      </div>
                    </div>
                  </CardContent>
                </TabsContent>
              </Tabs>
              
              <CardFooter className="flex justify-between text-sm text-gray-500 border-t border-gray-100 dark:border-gray-700 mt-4 pt-4">
                <p>Your privacy is important to us</p>
                <p>Secured by Esusu</p>
              </CardFooter>
            </Card>
          </motion.div>
        </div>
        
        {/* Additional contact info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-md p-6 rounded-xl border border-gray-100 dark:border-gray-700 text-center"
          >
            <div className="mx-auto bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mb-4">
              <PhoneIcon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">Phone</h3>
            <p className="text-gray-600 dark:text-gray-300">+234 (0) 7067013670</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Mon-Fri, 9am-5pm</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-md p-6 rounded-xl border border-gray-100 dark:border-gray-700 text-center"
          >
            <div className="mx-auto bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mb-4">
              <MessageSquareIcon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">Email</h3>
            <p className="text-gray-600 dark:text-gray-300">esusuonline@gmail.com</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">We will respond within 24hrs</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-md p-6 rounded-xl border border-gray-100 dark:border-gray-700 text-center"
          >
            <div className="mx-auto bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mb-4">
              <MapPinIcon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">Office</h3>
            <p className="text-gray-600 dark:text-gray-300">Nigeria</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Open for scheduled meetings</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}