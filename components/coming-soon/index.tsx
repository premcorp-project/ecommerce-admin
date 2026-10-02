'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Clock, Rocket, Sparkles, Zap } from 'lucide-react';

export default function ComingSoon() {
  const t = useTranslations('comingSoon');

  return (
    <div className="relative flex min-h-[calc(100vh-200px)] items-center justify-center overflow-hidden p-10">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden opacity-100">
        <motion.div
          className="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-primary opacity-5 blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-help-blue opacity-5 blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            x: [0, -40, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        {/* Animated icon */}
        <motion.div
          className="mb-8 flex justify-center"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: 'spring',
            stiffness: 260,
            damping: 20,
            delay: 0.1,
          }}
        >
          <div className="relative">
            {/* Rotating rings */}
            <motion.div
              className="absolute inset-0 -m-4"
              animate={{ rotate: 360 }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'linear',
              }}
            >
              <div className="h-32 w-32 rounded-full border-2 border-transparent border-t-primary border-r-primary opacity-30"></div>
            </motion.div>

            <motion.div
              className="absolute inset-0 -m-2"
              animate={{ rotate: -360 }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'linear',
              }}
            >
              <div className="h-28 w-28 rounded-full border-[3px] border-transparent border-l-help-blue border-b-help-blue"></div>
            </motion.div>

            {/* Center icon */}
            <motion.div
              className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary to-help-blue shadow-2xl shadow-primary/30"
              animate={{
                boxShadow: [
                  '0 20px 60px -15px rgba(30, 64, 175, 0.3)',
                  '0 20px 60px -15px rgba(30, 64, 175, 0.6)',
                  '0 20px 60px -15px rgba(30, 64, 175, 0.3)',
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <motion.div
                animate={{
                  rotate: [0, 360],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              >
                <Sparkles className="h-10 w-10 text-white" />
              </motion.div>
            </motion.div>
          </div>
        </motion.div>

        {/* Title with stagger animation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h1 className="mb-4 text-5xl font-bold text-black md:text-6xl lg:text-7xl">
            {t('title')}{' '}
            <span className="bg-gradient-to-r from-primary to-help-blue bg-clip-text text-transparent">
              {t('titleHighlight')}
            </span>
          </h1>
        </motion.div>

        {/* Description */}
        <motion.p
          className="mx-auto mb-8 max-w-2xl text-lg text-mute md:text-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {t('description')}
        </motion.p>

        {/* Feature cards */}
        <motion.div
          className="mb-12 grid gap-6 md:grid-cols-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <FeatureCard
            icon={<Rocket className="h-6 w-6" />}
            title={t('features.fast.title')}
            description={t('features.fast.description')}
            delay={0.6}
          />
          <FeatureCard
            icon={<Zap className="h-6 w-6" />}
            title={t('features.powerful.title')}
            description={t('features.powerful.description')}
            delay={0.7}
          />
          <FeatureCard
            icon={<Clock className="h-6 w-6" />}
            title={t('features.launch.title')}
            description={t('features.launch.description')}
            delay={0.8}
          />
        </motion.div>

        {/* Animated dots */}
        <motion.div
          className="mt-8 flex justify-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          <motion.div
            className="h-3 w-3 rounded-full bg-primary"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [1, 0.5, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: 0,
            }}
          />
          <motion.div
            className="h-3 w-3 rounded-full bg-primary"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [1, 0.5, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: 0.2,
            }}
          />
          <motion.div
            className="h-3 w-3 rounded-full bg-primary"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [1, 0.5, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: 0.4,
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
}

function FeatureCard({ icon, title, description, delay }: FeatureCardProps) {
  return (
    <motion.div
      className="group relative overflow-hidden rounded-2xl border border-border bg-white p-6 shadow-sm transition-all hover:shadow-lg"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -5 }}
    >
      {/* Gradient overlay on hover */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-primary/5 to-help-blue/5 opacity-0 transition-opacity group-hover:opacity-100"
        initial={false}
      />

      <div className="relative z-10">
        <motion.div
          className="mb-3 inline-flex rounded-xl bg-primary/10 p-3 text-primary"
          whileHover={{ rotate: 360 }}
          transition={{ duration: 0.6 }}
        >
          {icon}
        </motion.div>
        <h3 className="mb-2 text-lg font-semibold text-black">{title}</h3>
        <p className="text-sm text-mute">{description}</p>
      </div>
    </motion.div>
  );
}
