import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileQuestion } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="mx-auto max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-muted p-3">
              <FileQuestion className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
          <CardTitle>Page not found</CardTitle>
          <CardDescription>
            The page you are looking for does not exist or has been moved.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button asChild>
            <Link href="/">Back to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
