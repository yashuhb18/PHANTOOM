from fastapi import APIRouter
from backend.simulator.attack_simulator import attack_simulator

router = APIRouter(prefix="/api/simulate", tags=["simulate"])

@router.post("/attack-1")
async def simulate_attack_1():
    result = await attack_simulator.run_stage_1()
    return result

@router.post("/attack-2")
async def simulate_attack_2():
    result = await attack_simulator.run_stage_2()
    return result

@router.get("/status")
def get_simulation_status():
    return {"is_simulating": attack_simulator.is_simulating}

