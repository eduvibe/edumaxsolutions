import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, MoveLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function SuccessCard() {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto bg-green-100 rounded-full p-2 w-12 h-12 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <CardTitle className="text-2xl font-bold mt-4">Inquiry Sent!</CardTitle>
      </CardHeader>
            <CardContent className="text-center text-muted-foreground">
        <p>Thank you for your message. We have received your inquiry and will get back to you shortly.</p>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Button asChild variant="outline">
          <Link href="/">
            <MoveLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}