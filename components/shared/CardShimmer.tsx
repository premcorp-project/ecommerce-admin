'use client';

import { Card, CardContent, CardHeader } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

export default function CardShimmer() {
  return (
    <Card className="mt-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-60 mt-2" />
          </div>
          <Skeleton className="h-9 w-20" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          <Skeleton className="h-16 w-full" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-24" />
            <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
