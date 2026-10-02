'use client';

import { motion } from 'framer-motion';

export interface StepItem {
  number: number;
  title: string;
  description?: string;
}

export interface AppStepperProps {
  steps: StepItem[];
  currentStep: number;
  className?: string;
  stepNumberClassName?: string;
  stepTitleClassName?: string;
  stepDescriptionClassName?: string;
  lineHeight?: string;
  circleSize?: string;
}

const AppStepper = ({
  steps,
  currentStep,
  className = '',
  stepNumberClassName,
  stepTitleClassName,
  stepDescriptionClassName,
  lineHeight = 'h-20',
  circleSize = 'w-14 h-14',
}: AppStepperProps) => {
  return (
    <div className={`relative ${className}`}>
      {steps.map((step, index) => (
        <div key={step.number} className="relative">
          <div className="flex items-start gap-6">
            <div className="relative flex-shrink-0 z-10">
              <motion.div
                className={`${circleSize} rounded-full flex items-center justify-center text-xl font-semibold ${
                  stepNumberClassName ||
                  (currentStep >= step.number
                    ? 'bg-background border-2 border-primary text-primary'
                    : 'bg-background text-muted-foreground border-2 border-border')
                }`}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{
                  scale: currentStep === step.number ? 1.1 : 1,
                  opacity: 1,
                }}
                transition={{
                  duration: 0.3,
                  type: 'spring',
                  stiffness: 200,
                }}
              >
                {step.number < 10 ? `0${step.number}` : step.number}
              </motion.div>
            </div>

            {/* Content */}
            <div className="flex-1 pb-20">
              <motion.h3
                className={
                  stepTitleClassName ||
                  `text-lg font-semibold mb-1 ${
                    currentStep >= step.number
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                  }`
                }
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                {step.title}
              </motion.h3>
              {step.description && (
                <motion.p
                  className={
                    stepDescriptionClassName || 'text-sm text-muted-foreground'
                  }
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.1 + 0.1 }}
                >
                  {step.description}
                </motion.p>
              )}
            </div>
          </div>

          {/* Connecting Line */}
          {index < steps.length - 1 && (
            <div
              className={`absolute left-7 top-14 w-0.5 ${lineHeight} -translate-x-1/2`}
            >
              <div className="absolute inset-0 border-l-2 border-dashed border-border"></div>
              <motion.div
                className="absolute inset-0 border-l-2 border-primary origin-top"
                initial={{ scaleY: 0 }}
                animate={{
                  scaleY: currentStep > step.number ? 1 : 0,
                }}
                transition={{
                  duration: 0.5,
                  ease: 'easeInOut',
                }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default AppStepper;
