import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { DefectSeverity, DefectStatus, Role } from "@prisma/client";
import { checkUserRole } from "@/lib/roleCheck";

// Define allowed roles
const ROLES = {
    VIEW_DEFECTS: [Role.ADMIN, Role.ASSEMBLER, Role.RETURN_QC, Role.SERVICE_PERSON],
    MODIFY_DEFECTS: [Role.ADMIN, Role.SERVICE_PERSON],
    DELETE_DEFECTS: [Role.ADMIN],
};

// GET: Fetch a single defect by ID
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const userId = authUser?.id;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const isAuthorized = await checkUserRole(userId, ROLES.VIEW_DEFECTS);
        if (!isAuthorized) {
            return NextResponse.json({ error: "Forbidden: You do not have permission to view this defect." }, { status: 403 });
        }

        const defect = await prisma.defect.findUnique({
            where: { id: params.id },
            include: {
                component: {
                    select: {
                        id: true,
                        name: true,
                        sku: true,
                        category: true
                    }
                },
                reportedBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true
                    }
                }
            }
        });

        if (!defect) {
            return NextResponse.json(
                { error: "Defect not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(defect);
    } catch (error) {
        console.error("Error fetching defect:", error);
        return NextResponse.json(
            { error: "Failed to fetch defect" },
            { status: 500 }
        );
    }
}

// PUT: Update a defect by ID
export async function PUT(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const userId = authUser?.id;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized: User ID is missing." }, { status: 401 });
        }

        const isAuthorized = await checkUserRole(userId, ROLES.MODIFY_DEFECTS);
        if (!isAuthorized) {
            return NextResponse.json({ error: "Forbidden: You do not have permission to update defects." }, { status: 403 });
        }

        // Get user from database
        const user = await prisma.user.findUnique({
            where: { userId }
        });

        if (!user) {
            return NextResponse.json(
                { error: "User not found in database" },
                { status: 404 }
            );
        }
        if (user.role === Role.PENDING_APPROVAL) {
            return NextResponse.json({ error: "Forbidden: Your account is pending approval." }, { status: 403 });
        }

        const json = await req.json();
        const {
            severity,
            status,
            description,
            resolution,
            images
        } = json;

        // Check if defect exists
        const defect = await prisma.defect.findUnique({
            where: { id: params.id }
        });

        if (!defect) {
            return NextResponse.json(
                { error: "Defect not found" },
                { status: 404 }
            );
        }

        // Create update data
        interface DefectUpdateData {
            severity?: DefectSeverity;
            status?: DefectStatus;
            description?: string;
            resolution?: string | null;
            images?: string[];
        }

        const updateData: DefectUpdateData = {};

        if (severity) updateData.severity = severity;
        if (status) updateData.status = status;
        if (description) updateData.description = description;
        if (resolution !== undefined) updateData.resolution = resolution;
        if (images) updateData.images = images;

        // Update the defect
        const updatedDefect = await prisma.defect.update({
            where: { id: params.id },
            data: updateData,
            include: {
                component: {
                    select: {
                        id: true,
                        name: true,
                        sku: true,
                        category: true
                    }
                },
                reportedBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true
                    }
                }
            }
        });

        return NextResponse.json(updatedDefect);
    } catch (error) {
        console.error("Error updating defect:", error);
        return NextResponse.json(
            { error: "Failed to update defect" },
            { status: 500 }
        );
    }
}

// DELETE: Delete a defect by ID
export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const userId = authUser?.id;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const isAuthorized = await checkUserRole(userId, ROLES.DELETE_DEFECTS);
        if (!isAuthorized) {
            return NextResponse.json({ error: "Forbidden: You do not have permission to delete defects." }, { status: 403 });
        }

        // Check if defect exists
        const defect = await prisma.defect.findUnique({
            where: { id: params.id }
        });

        if (!defect) {
            return NextResponse.json(
                { error: "Defect not found" },
                { status: 404 }
            );
        }

        // Delete the defect
        await prisma.defect.delete({
            where: { id: params.id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting defect:", error);
        return NextResponse.json(
            { error: "Failed to delete defect" },
            { status: 500 }
        );
    }
}