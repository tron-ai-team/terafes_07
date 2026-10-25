import com.tronai.desktop.policy.*;
public class PolicyProbe {
  public static void main(String[] args) {
    CommandPolicyEngine e = new CommandPolicyEngine();
    for (String tool : new String[]{"OPENCLAW","OPENCODE","FOO"}) {
      PolicyDecision d = e.evaluate(new PolicyRequest(tool,"RUN_GOAL","C:/Users/engrm/OneDrive/Desktop/Group7/_v4_golden_evidence/opencode-workspace",null,null,null,null,null,null));
      System.out.println(tool+" -> "+d.risk()+" | "+d.reason());
    }
  }
}