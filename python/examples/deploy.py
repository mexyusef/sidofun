"""
Automated deployment with health checks.

This script demonstrates:
- Multi-step deployment pipeline
- Error handling and rollback
- Health check verification
- Deployment reporting
"""

from sidofun_desktop import DesktopWinClient
import json
import sys
from datetime import datetime


def deploy(environment: str = "production", health_check_url: str = None):
    """Automated deployment with verification.
    
    Args:
        environment: Target environment (production, staging, development)
        health_check_url: URL for health check (optional)
    """
    print("=" * 60)
    print(f"🚀 DEPLOYMENT AUTOMATION - {environment.upper()}")
    print("=" * 60)
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    steps_completed = []
    deployment_success = False
    
    with DesktopWinClient() as client:
        ps = client.pwsh_spawn(f"Deploy-{environment}")
        
        try:
            # Step 1: Build
            print("📦 Step 1: Building...")
            print("-" * 60)
            build_result = client.pwsh_exec(
                ps,
                "npm run build 2>&1",
                wait=True,
                timeout=300000  # 5 minutes
            )
            
            build_output = build_result.get("output", "")
            print(build_output)
            
            if build_result.get("exitCode", 0) != 0:
                raise Exception("Build failed! Check output for errors.")
            
            steps_completed.append(("Build", True))
            print("✅ Build successful\n")
            
            # Step 2: Test (optional, can be skipped)
            print("🧪 Step 2: Running Tests...")
            print("-" * 60)
            test_result = client.pwsh_exec(
                ps,
                "npm test 2>&1",
                wait=True,
                timeout=300000
            )
            
            test_output = test_result.get("output", "")
            print(test_output)
            
            if test_result.get("exitCode", 0) != 0:
                print("⚠️  Tests failed, but continuing deployment...")
                steps_completed.append(("Tests", False))
            else:
                steps_completed.append(("Tests", True))
            print()
            
            # Step 3: Deploy
            print(f"🚀 Step 3: Deploying to {environment}...")
            print("-" * 60)
            
            # Deployment command (customize based on your deployment method)
            deploy_commands = {
                "development": "npm run deploy:dev",
                "staging": "npm run deploy:staging",
                "production": "npm run deploy:prod"
            }
            
            deploy_cmd = deploy_commands.get(environment, "npm run deploy")
            deploy_result = client.pwsh_exec(
                ps,
                f"{deploy_cmd} 2>&1",
                wait=True,
                timeout=600000  # 10 minutes
            )
            
            deploy_output = deploy_result.get("output", "")
            print(deploy_output)
            
            if deploy_result.get("exitCode", 0) != 0:
                raise Exception("Deployment failed!")
            
            steps_completed.append(("Deploy", True))
            print("✅ Deployment successful\n")
            
            # Step 4: Health Check
            print("🏥 Step 4: Running Health Checks...")
            print("-" * 60)
            
            if health_check_url:
                health_result = client.pwsh_exec(
                    ps,
                    f'curl -f "{health_check_url}" 2>&1',
                    wait=True,
                    timeout=30000
                )
                print(health_result.get("output", ""))
                
                if health_result.get("exitCode", 0) != 0:
                    print("⚠️  Health check failed!")
                    steps_completed.append(("Health Check", False))
                else:
                    steps_completed.append(("Health Check", True))
                    print("✅ Health check passed\n")
            else:
                print("⏭️  Skipping health check (no URL provided)\n")
                steps_completed.append(("Health Check", None))
            
            deployment_success = True
            
        except Exception as e:
            print(f"\n❌ DEPLOYMENT FAILED: {e}")
            steps_completed.append((str(e), False))
            
        finally:
            client.pwsh_close(ps)
    
    # Deployment Report
    print("\n" + "=" * 60)
    print("📊 DEPLOYMENT REPORT")
    print("=" * 60)
    print(f"Environment: {environment}")
    print(f"Completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    for step, success in steps_completed:
        status = "✅" if success else ("⚠️ " if success is None else "❌")
        print(f"{status} {step}")
    
    print()
    if deployment_success:
        print("🎉 DEPLOYMENT SUCCESSFUL!")
    else:
        print("❌ DEPLOYMENT FAILED")
        print("\n💡 Rollback instructions:")
        print("   git revert HEAD")
        print("   npm run deploy:" + environment)
    
    print("=" * 60)
    
    return deployment_success


def rollback(environment: str = "production"):
    """Rollback deployment to previous version.
    
    Args:
        environment: Target environment
    """
    print("=" * 60)
    print(f"⏮️  ROLLBACK - {environment.upper()}")
    print("=" * 60)
    
    with DesktopWinClient() as client:
        ps = client.pwsh_spawn(f"Rollback-{environment}")
        
        try:
            # Revert last commit
            print("📋 Reverting last commit...")
            revert_result = client.pwsh_exec(ps, "git revert HEAD --no-edit", wait=True)
            print(revert_result.get("output", ""))
            
            # Deploy previous version
            print(f"\n🚀 Deploying previous version to {environment}...")
            deploy_result = client.pwsh_exec(
                ps,
                f"npm run deploy:{environment}",
                wait=True,
                timeout=600000
            )
            print(deploy_result.get("output", ""))
            
            print("\n✅ Rollback completed!")
            
        except Exception as e:
            print(f"\n❌ Rollback failed: {e}")
            
        finally:
            client.pwsh_close(ps)
    
    print("=" * 60)


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Deployment Automation")
    parser.add_argument(
        "-e", "--environment",
        type=str,
        choices=["development", "staging", "production"],
        default="production",
        help="Target environment"
    )
    parser.add_argument(
        "--health-check",
        type=str,
        help="Health check URL"
    )
    parser.add_argument(
        "--rollback",
        action="store_true",
        help="Rollback to previous version"
    )
    
    args = parser.parse_args()
    
    try:
        if args.rollback:
            rollback(args.environment)
        else:
            deploy(
                environment=args.environment,
                health_check_url=args.health_check
            )
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)
