"use client";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="mx-auto max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
          </div>
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription>
            {error.message || "An unexpected error occurred. Please try again."}
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Button onClick={reset}>Try again</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
