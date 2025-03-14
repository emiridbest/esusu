import React, { useContext } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { motion } from "framer-motion";
import { ThemeContext } from './Layout';
import { Button } from "@/components/ui/button";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

// Feature card component with fewer divs
const FeatureCard = ({ 
  image, 
  title, 
  description, 
  path, 
  delay = 0
}: { 
  image: string; 
  title: string; 
  description: string; 
  path: string;
  delay?: number;
}) => {
  const router = useRouter();
  
  return (
    <motion.div 
      className="w-full sm:w-1/2 lg:w-1/4 p-4"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      viewport={{ once: true }}
      onClick={() => router.push(path)}
    >
      <article className="glass-card h-full p-6 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] cursor-pointer">
        <Image 
          src={image} 
          alt={title}
          width={80}
          height={80}
          className="mx-auto mb-5 object-contain"
        />
        
        <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white border-l-4 border-primary pl-3">
          {title}
        </h3>
        <p className="text-gray-600 dark:text-gray-300">{description}</p>
      </article>
    </motion.div>
  );
};

// Streamlined Section component
const Section = ({ 
  title, 
  description, 
  image, 
  reverse = false,
  glassBg = false,
  accentColor = "from-primary/20 to-primary/5",
  children 
}: {
  title: string;
  description: string;
  image: string;
  reverse?: boolean;
  glassBg?: boolean;
  accentColor?: string;
  children?: React.ReactNode;
}) => (
  <section className={cn(
    "py-16 px-4",
    glassBg && `bg-gradient-to-br ${accentColor} backdrop-blur-lg`
  )}>
    <div className={cn(
      "max-w-screen-lg mx-auto",
      glassBg && "glass-card p-8"
    )}>
      <div className={`flex flex-col ${reverse ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-8`}>
        <motion.figure 
          className="lg:w-1/2"
          initial={{ opacity: 0, x: reverse ? -30 : 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
        >
          <div className="rounded-2xl overflow-hidden shadow-2xl border border-gray-200/50 dark:border-gray-700/50 group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"></div>
            <Image 
              src={image} 
              alt={title} 
              width={500}
              height={500}
              className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-500"
            />
          </div>
        </motion.figure>

        <motion.div 
          className="lg:w-1/2 space-y-4"
          initial={{ opacity: 0, x: reverse ? 30 : -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
            <span className="inline-block border-b-4 border-primary pb-2">{title}</span>
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
            {description}
          </p>
          {children}
        </motion.div>
      </div>
    </div>
  </section>
);

const Hero: React.FC = () => {
  const router = useRouter();
  const { darkMode } = useContext(ThemeContext);
  
  const features = [
    {
      image: "/save.png",
      title: "Save and grow",
      description: "Access popular stablecoins and watch your savings grow over time",
      path: "/miniSafe"
    },
    {
      image: "/target.png",
      title: "Set a Target",
      description: "Create personalized savings goals and track your progress easily",
      path: "/"
    },
    {
      image: "/thrift.png",
      title: "Save Together",
      description: "Save with 5 friends and make 5x returns every month through group thrift",
      path: "/thrift"
    },
    {
      image: "/earn.png",
      title: "Swap Tokens",
      description: "Trade your tokens in a few taps with low fees and best rates",
      path: "/"
    },
    {
      image: "/debt.png",
      title: "Say no to debt",
      description: "Pool your funds together with friends and avoid high-interest loans",
      path: "/"
    }
  ];

  return (
    <>
      {/* Hero Section - Simplified */}
      <section className="relative pt-10 pb-20 overflow-hidden bg-gradient-radial from-primary/5 via-transparent to-transparent">
        <div className="max-w-screen-xl mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
            <motion.div 
              className="lg:w-1/2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white leading-tight mb-6">
                Harness the <span className="text-primary">power</span> of community savings
              </h1>
              
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
                Simple, secure, and social way to save and grow your wealth in the digital economy.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Button 
                  size="lg" 
                  className="bg-primary hover:bg-primary/90 text-white"
                  onClick={() => router.push('/miniSafe')}
                >
                  Start Saving
                  <ArrowRightIcon className="ml-2 h-5 w-5" />
                </Button>
                
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={() => router.push('/thrift')}
                  className="border-primary text-primary hover:bg-primary/10"
                >
                  Join a Group
                </Button>
              </div>
              
              <div className="mt-10 flex items-center space-x-6">
                {/* User avatars with simpler structure */}
                <div className="flex">
                  {[...Array(3)].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-8 h-8 rounded-full bg-white dark:black border-2 border-white dark:border-gray-800 shadow-lg overflow-hidden -ml-2 first:ml-0"
                      style={{ zIndex: 3 - i }}
                    >
                      <Image src="/esusu.png" alt="User" width={32} height={32} />
                    </div>
                  ))}
                </div>
                <p className="text-gray-600 dark:text-gray-300">
                  <span className="font-semibold">1,500+</span> people already saving
                </p>
              </div>
            </motion.div>
            
            <motion.div 
              className="lg:w-1/2"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              {/* App preview with fewer nested divs */}
              <figure className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-full blur-xl opacity-70 animate-pulse"></div>
                <div className="glass-card p-2 rounded-3xl overflow-hidden">
                  <Image 
                    src="/ui.png" 
                    alt="Esusu Mobile App" 
                    width={500} 
                    height={500} 
                    className="rounded-2xl w-full h-auto" 
                  />
                </div>
              </figure>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Features Section - Simplified */}
        <section className="max-w-screen-xl mx-auto px-4">
          <motion.header 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Everything you need to <span className="text-primary">manage your finances</span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Simple tools that help you save, invest and grow your wealth together
            </p>
          </motion.header>
          
          <div className="flex flex-wrap -mx-4">
            {features.map((feature, index) => (
              <FeatureCard 
                key={index} 
                {...feature} 
                delay={index * 0.1}
              />
            ))}
          </div>
        </section>
      
      {/* Mobile Optimized Section */}
      <Section
        title="Mobile optimized. Built for you."
        description="Access Esusu anywhere, anytime. Swap tokens in a tap. Send crypto like a text message. Manage your finances on the go with our intuitive mobile experience."
        image="/earn.png"
        glassBg
        accentColor="from-primary/20 to-indigo-500/10"
      >
        <Button 
          className="mt-6"
          onClick={() => router.push('/')}
        >
          Discover More
          <ArrowRightIcon className="ml-2 h-4 w-4" />
        </Button>
      </Section>
      
      {/* Communities Section */}
      <Section
        title="Communities to build wealth."
        description="Join forces with friends and family to achieve your financial goals faster. Esusu streamlines group pooling to maximize your savings potential through collective effort."
        image="/thrift.png"
        reverse
      >
        <Button 
          variant="outline"
          className="mt-6 border-primary text-primary hover:bg-primary/10"
          onClick={() => router.push('/thrift')}
        >
          Start a Group
          <ArrowRightIcon className="ml-2 h-4 w-4" />
        </Button>
      </Section>
      
      {/* Save and Earn Section */}
      <Section
        title="Save and Earn."
        description="Deposit your stablecoins into a time-locked vault and earn Esusu Tokens as rewards. Watch your wealth grow while contributing to a sustainable ecosystem."
        image="/earn.png"
        glassBg
        accentColor="from-green-500/20 to-primary/10 dark:from-black dark:to-indigo/10"
      >
        <div className="flex flex-wrap gap-4 mt-6">
          <Button onClick={() => router.push('/miniSafe')}>
            Start Saving
          </Button>
          <Button variant="ghost">
            Learn More
          </Button>
        </div>
      </Section>
      
      {/* No Debts Section */}
      <Section
        title="Say no to debts."
        description="Break the cycle of high-interest loans. With Esusu's community-powered approach to finance, you can meet your financial needs without falling into debt traps."
        image="/debt.png"
        reverse
      />
    </>
  );
};

export default Hero;