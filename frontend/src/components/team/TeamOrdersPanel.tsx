import {useState} from "react";
import type {Monster} from "../../types/Monster";

interface Props {
    monsters: Monster[];
    playOrder: number[];
    runePriorityOrder: number[];
    onMovePlayOrder: (
        sourceIndex: number,
        destinationIndex: number
    ) => void;
    onMoveRunePriority: (
        sourceIndex: number,
        destinationIndex: number
    ) => void;
}

type OrderType = "play" | "rune";

interface OrderRowProps {
    label: string;
    orderType: OrderType;
    monsterIds: number[];
    monstersById: ReadonlyMap<number, Monster>;
    draggedIndex: number | null;
    onDragStart: (orderType: OrderType, index: number) => void;
    onDragEnd: () => void;
    onDrop: (
        orderType: OrderType,
        destinationIndex: number
    ) => void;
}

function OrderRow({
                      label,
                      orderType,
                      monsterIds,
                      monstersById,
                      draggedIndex,
                      onDragStart,
                      onDragEnd,
                      onDrop,
                  }: OrderRowProps) {
    return (
        <div className="team-order-row">
            <div className="team-order-label">{label}</div>

            <div className="team-order-list">
                {monsterIds.map((monsterId, index) => {
                    const monster = monstersById.get(monsterId);

                    if (!monster) {
                        return null;
                    }

                    const isDragged = draggedIndex === index;

                    return (
                        <div
                            key={monsterId}
                            className={
                                isDragged
                                    ? "team-order-card dragging"
                                    : "team-order-card"
                            }
                            draggable
                            onDragStart={(event) => {
                                event.dataTransfer.effectAllowed = "move";
                                event.dataTransfer.setData(
                                    "text/plain",
                                    String(index)
                                );
                                onDragStart(orderType, index);
                            }}
                            onDragOver={(event) => {
                                event.preventDefault();
                                event.dataTransfer.dropEffect = "move";
                            }}
                            onDrop={(event) => {
                                event.preventDefault();
                                onDrop(orderType, index);
                            }}
                            onDragEnd={onDragEnd}
                        >
              <span
                  className="team-order-drag-handle"
                  aria-hidden="true"
              >
                ⠿
              </span>

                            <span className="team-order-position">
                {index + 1}
              </span>

                            {monster.imageUrl && (
                                <img
                                    className="team-order-monster-image"
                                    src={monster.imageUrl}
                                    alt=""
                                />
                            )}

                            <span className="team-order-monster-name">
                {monster.name}
              </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function TeamOrdersPanel({
                                            monsters,
                                            playOrder,
                                            runePriorityOrder,
                                            onMovePlayOrder,
                                            onMoveRunePriority,
                                        }: Props) {
    const [draggedOrderType, setDraggedOrderType] =
        useState<OrderType | null>(null);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(
        null
    );

    const monstersById = new Map(
        monsters.map((monster) => [monster.id, monster])
    );

    const resetDragState = (): void => {
        setDraggedOrderType(null);
        setDraggedIndex(null);
    };

    const handleDragStart = (
        orderType: OrderType,
        index: number
    ): void => {
        setDraggedOrderType(orderType);
        setDraggedIndex(index);
    };

    const handleDrop = (
        orderType: OrderType,
        destinationIndex: number
    ): void => {
        if (
            draggedOrderType !== orderType ||
            draggedIndex === null
        ) {
            resetDragState();
            return;
        }

        if (orderType === "play") {
            onMovePlayOrder(draggedIndex, destinationIndex);
        } else {
            onMoveRunePriority(draggedIndex, destinationIndex);
        }

        resetDragState();
    };

    if (monsters.length === 0) {
        return null;
    }

    return (
        <div className="card team-orders-panel">
            <OrderRow
                label="Ordre de jeu"
                orderType="play"
                monsterIds={playOrder}
                monstersById={monstersById}
                draggedIndex={
                    draggedOrderType === "play" ? draggedIndex : null
                }
                onDragStart={handleDragStart}
                onDragEnd={resetDragState}
                onDrop={handleDrop}
            />

            <OrderRow
                label="Priorité de runage"
                orderType="rune"
                monsterIds={runePriorityOrder}
                monstersById={monstersById}
                draggedIndex={
                    draggedOrderType === "rune" ? draggedIndex : null
                }
                onDragStart={handleDragStart}
                onDragEnd={resetDragState}
                onDrop={handleDrop}
            />
        </div>
    );
}
