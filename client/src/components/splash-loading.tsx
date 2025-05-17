import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Database, Activity, Users, BarChart, PieChart } from "lucide-react";
import { cn } from "@/lib/utils";

interface SplashLoadingProps {
  onComplete: () => void;
  duration?: number;
}

export function SplashLoading({ onComplete, duration = 5000 }: SplashLoadingProps) {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + 1;
        return newProgress <= 100 ? newProgress : 100;
      });
    }, duration / 100);
    
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 500); // Allow exit animation to complete
    }, duration);
    
    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [duration, onComplete]);
  
  const icons = [
    <Database className="text-primary" key="database" />,
    <Activity className="text-indigo-500" key="activity" />, 
    <Users className="text-blue-400" key="users" />,
    <BarChart className="text-cyan-500" key="barchart" />,
    <PieChart className="text-sky-600" key="piechart" />
  ];
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          className="fixed inset-0 bg-background flex flex-col items-center justify-center z-50"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-full max-w-md px-4">
            <motion.div 
              className="flex items-center justify-center mb-12"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="text-4xl font-bold bg-gradient-to-r from-primary via-blue-500 to-indigo-600 bg-clip-text text-transparent">
                ContactSync
              </div>
            </motion.div>
            
            <motion.div 
              className="flex justify-around mb-8"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {icons.map((icon, i) => (
                <motion.div 
                  key={i}
                  className="h-10 w-10 flex items-center justify-center"
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ 
                    y: 0,
                    opacity: 1,
                    rotate: [0, 10, 0, -10, 0]
                  }}
                  transition={{ 
                    delay: 0.3 + (i * 0.1),
                    duration: 0.5,
                    rotate: { 
                      repeat: Infinity, 
                      repeatType: "mirror", 
                      duration: 2.5,
                      delay: 0.5 + (i * 0.5)
                    }
                  }}
                >
                  {icon}
                </motion.div>
              ))}
            </motion.div>
            
            <motion.div
              className="mb-2 relative h-2 bg-muted overflow-hidden rounded-full"
              initial={{ width: "100%", opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.5 }}
            >
              <motion.div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-indigo-600 rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.1, ease: "linear" }}
              />
            </motion.div>
            
            <motion.div 
              className="flex justify-between items-center text-sm font-medium text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <span>Loading your data</span>
              <span className={cn(
                "transition-colors duration-300",
                progress === 100 ? "text-primary font-semibold" : ""
              )}>{progress}%</span>
            </motion.div>
            
            <motion.div
              className="mt-8 text-center text-muted-foreground text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <p>Preparing your dashboards and analytics</p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}