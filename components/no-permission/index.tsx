'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, Mail, ShieldX, UserX } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AppButton } from '@/components/shared/AppButton';
import { removeUser } from '@/lib/user';

export default function NoPermission() {
  const router = useRouter();
  const t = useTranslations('noPermission');
  const tRestricted = useTranslations('noPermission.cards.restricted');
  const tNoAccess = useTranslations('noPermission.cards.noAccess');
  const tContact = useTranslations('noPermission.cards.contact');

  const handleLogout = () => {
    removeUser();
    router.push('/login');
  };

  return (
    <div className="relative flex min-h-[calc(100vh-200px)] items-center justify-center overflow-hidden p-10">
      <div className="absolute inset-0 overflow-hidden opacity-100">
        <motion.div
          className="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-destructive opacity-5 blur-3xl"
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
          className="absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-orange-500 opacity-5 blur-3xl"
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

      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
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
            <motion.div
              className="absolute inset-0 -m-4"
              animate={{ rotate: 360 }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'linear',
              }}
            >
              <div className="h-32 w-32 rounded-full border-2 border-transparent border-r-destructive border-t-destructive opacity-30" />
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
              <div className="h-28 w-28 rounded-full border-[3px] border-transparent border-b-orange-500 border-l-orange-500" />
            </motion.div>

            <motion.div
              className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-destructive to-orange-500 shadow-2xl shadow-destructive/30"
              animate={{
                boxShadow: [
                  '0 20px 60px -15px rgba(239, 68, 68, 0.3)',
                  '0 20px 60px -15px rgba(239, 68, 68, 0.6)',
                  '0 20px 60px -15px rgba(239, 68, 68, 0.3)',
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <ShieldX className="h-10 w-10 text-white" />
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h1 className="mb-4 text-5xl font-bold text-black md:text-6xl lg:text-7xl">
            {t('title')}{' '}
            <span className="bg-gradient-to-r from-destructive to-orange-500 bg-clip-text text-transparent">
              {t('titleHighlight')}
            </span>
          </h1>
        </motion.div>

        <motion.p
          className="mx-auto mb-8 max-w-2xl text-lg text-mute md:text-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {t('description')}
        </motion.p>

        <motion.div
          className="mb-12 grid gap-6 md:grid-cols-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <InfoCard
            delay={0.6}
            icon={<Lock className="h-6 w-6" />}
            title={tRestricted('title')}
            description={tRestricted('description')}
          />
          <InfoCard
            delay={0.7}
            icon={<UserX className="h-6 w-6" />}
            title={tNoAccess('title')}
            description={tNoAccess('description')}
          />
          <InfoCard
            delay={0.8}
            icon={<Mail className="h-6 w-6" />}
            title={tContact('title')}
            description={tContact('description')}
          />
        </motion.div>

        <motion.div
          className="flex justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <AppButton
            variant="secondary"
            onClick={handleLogout}
            className="px-8"
          >
            {t('logoutButton')}
          </AppButton>
        </motion.div>
      </div>
    </div>
  );
}

interface InfoCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  delay: number;
}

function InfoCard({ icon, title, description, delay }: InfoCardProps) {
  return (
    <motion.div
      className="group relative overflow-hidden rounded-2xl border border-border bg-white p-6 shadow-sm transition-all hover:shadow-lg"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -5 }}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-destructive/5 to-orange-500/5 opacity-0 transition-opacity group-hover:opacity-100"
        initial={false}
      />

      <div className="relative z-10">
        <motion.div
          className="mb-3 inline-flex rounded-xl bg-destructive/10 p-3 text-destructive"
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
